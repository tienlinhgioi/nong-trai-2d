begin;
create schema farm_private;
revoke all on schema farm_private from public,anon;
grant usage on schema farm_private to authenticated;
alter table public.action_receipts set schema farm_private;
alter function public.farm_state(public.farms) set schema farm_private;
alter function public.ensure_farm(uuid,text) set schema farm_private;
alter function public.perform_farm_action(uuid,uuid,jsonb) set schema farm_private;
alter function public.farm_leaderboard() set schema farm_private;
create or replace function farm_private.farm_state(f public.farms) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('name',f.name,'coins',f.coins,'revenue',f.revenue,'seeds',f.seeds,'produce',f.produce,'plots',f.plots);
$$;

create or replace function farm_private.ensure_farm(p_user uuid,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.farms;
begin
 if auth.uid() is null or auth.uid()<>p_user then raise exception 'Không được truy cập nông trại này.'; end if;
 insert into public.farms(user_id,name,plots)
 values(p_user,left(coalesce(nullif(trim(p_name),''),'Người làm vườn'),30),
 (select jsonb_agg(jsonb_build_object('id',i,'crop',null,'wateredAt',null) order by i) from generate_series(0,23) i))
 on conflict(user_id) do nothing;
 select * into strict f from public.farms where user_id=p_user;
 return farm_private.farm_state(f);
end $$;

create or replace function farm_private.perform_farm_action(p_user uuid,p_request uuid,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.farms; k text:=p_action->>'kind'; c text:=p_action->>'crop';
 q integer; idx integer; plot jsonb; sec integer; price integer; n bigint; receipt jsonb;
begin
 if auth.uid() is null or auth.uid()<>p_user then raise exception 'Không được truy cập nông trại này.'; end if;
 select * into strict f from public.farms where user_id=p_user for update;
 select action into receipt from farm_private.action_receipts where user_id=p_user and request_id=p_request;
 if found then
  if receipt<>p_action then raise exception 'Mã thao tác đã được sử dụng.'; end if;
  return farm_private.farm_state(f);
 end if;
 if k in ('buy','sell','plant') and (c is null or c not in ('carrot','corn','tomato')) then raise exception 'Loại cây không hợp lệ.'; end if;
 if k in ('buy','sell') then
  if jsonb_typeof(p_action->'quantity') is distinct from 'number' or (p_action->>'quantity') !~ '^[0-9]+$' then raise exception 'Số lượng không hợp lệ.'; end if;
  q:=(p_action->>'quantity')::integer;
  if q<1 or q>99 then raise exception 'Số lượng không hợp lệ.'; end if;
  if k='buy' then
   price:=case c when 'carrot' then 5 when 'corn' then 10 else 15 end;
   if f.coins<price*q then raise exception 'Bạn chưa đủ xu.'; end if;
   f.coins:=f.coins-price*q;
   f.seeds:=jsonb_set(f.seeds,array[c],to_jsonb((f.seeds->>c)::bigint+q));
  else
   n:=(f.produce->>c)::bigint;
   if n<q then raise exception 'Không đủ nông sản.'; end if;
   price:=case c when 'carrot' then 10 when 'corn' then 22 else 35 end;
   f.produce:=jsonb_set(f.produce,array[c],to_jsonb(n-q));
   f.coins:=f.coins+price*q; f.revenue:=f.revenue+price*q;
  end if;
 elsif k in ('plant','water','harvest') then
  if jsonb_typeof(p_action->'plot') is distinct from 'number' or (p_action->>'plot') !~ '^[0-9]+$' then raise exception 'Ô đất không hợp lệ.'; end if;
  idx:=(p_action->>'plot')::integer;
  if idx<0 or idx>23 then raise exception 'Ô đất không hợp lệ.'; end if;
  plot:=f.plots->idx;
  if k='plant' then
   if plot->>'crop' is not null then raise exception 'Ô đất đã có cây.'; end if;
   n:=(f.seeds->>c)::bigint;
   if n<1 then raise exception 'Bạn đã hết hạt giống.'; end if;
   f.seeds:=jsonb_set(f.seeds,array[c],to_jsonb(n-1));
   plot:=jsonb_build_object('id',idx,'crop',c,'wateredAt',null);
  elsif k='water' then
   if plot->>'crop' is null then raise exception 'Hãy gieo hạt trước.'; end if;
   if plot->>'wateredAt' is not null then raise exception 'Cây đã được tưới.'; end if;
   plot:=jsonb_set(plot,'{wateredAt}',to_jsonb(clock_timestamp()));
  else
   c:=plot->>'crop';
   sec:=case c when 'carrot' then 60 when 'corn' then 180 when 'tomato' then 300 end;
   if c is null or plot->>'wateredAt' is null or clock_timestamp()<(plot->>'wateredAt')::timestamptz+make_interval(secs=>sec) then raise exception 'Cây chưa sẵn sàng thu hoạch.'; end if;
   f.produce:=jsonb_set(f.produce,array[c],to_jsonb((f.produce->>c)::bigint+1));
   plot:=jsonb_build_object('id',idx,'crop',null,'wateredAt',null);
  end if;
  f.plots:=jsonb_set(f.plots,array[idx::text],plot);
 else raise exception 'Thao tác không hợp lệ.';
 end if;
 update public.farms set coins=f.coins,revenue=f.revenue,seeds=f.seeds,produce=f.produce,plots=f.plots,updated_at=clock_timestamp() where user_id=p_user;
 insert into farm_private.action_receipts(user_id,request_id,action) values(p_user,p_request,p_action);
 return farm_private.farm_state(f);
end $$;
create or replace function farm_private.farm_leaderboard() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',r.name,'revenue',r.revenue) order by r.revenue desc,r.user_id),'[]'::jsonb)
 from (select name,revenue,user_id from public.farms order by revenue desc,user_id limit 20) r where auth.uid() is not null;
$$;

-- Exposed wrappers run as the caller; privileged implementations live outside Data API schemas.
create function public.ensure_farm(p_user uuid,p_name text) returns jsonb
language sql security invoker set search_path='' as $$ select farm_private.ensure_farm(p_user,p_name) $$;
create function public.perform_farm_action(p_user uuid,p_request uuid,p_action jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select farm_private.perform_farm_action(p_user,p_request,p_action) $$;
create function public.farm_leaderboard() returns jsonb
language sql stable security invoker set search_path='' as $$ select farm_private.farm_leaderboard() $$;
revoke all on function public.ensure_farm(uuid,text),public.perform_farm_action(uuid,uuid,jsonb),public.farm_leaderboard() from public,anon;
grant execute on function public.ensure_farm(uuid,text),public.perform_farm_action(uuid,uuid,jsonb),public.farm_leaderboard() to authenticated;
commit;
