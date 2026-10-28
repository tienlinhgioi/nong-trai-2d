import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAction } from '../shared/game';

// Pages has no server runtime. These RPCs enforce ownership and atomicity in Postgres.
export async function staticApi<T>(client:SupabaseClient,path:string,body?:unknown):Promise<T>{
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)throw Object.assign(new Error('Vui lòng đăng nhập lại.'),{status:401});
 let result;
 if(path==='farm')result=await client.rpc('ensure_farm',{p_user:user.id,p_name:typeof user.user_metadata.name==='string'?user.user_metadata.name:'Người làm vườn'});
 else if(path==='leaderboard')result=await client.rpc('farm_leaderboard');
 else if(path==='actions'){
  if(!body||typeof body!=='object')throw Object.assign(new Error('Thao tác không hợp lệ.'),{status:400});
  const request=body as {requestId:unknown;action:unknown};
  if(typeof request.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.requestId))throw Object.assign(new Error('Mã thao tác không hợp lệ.'),{status:400});
  let action;try{action=parseAction(request.action)}catch(e){throw Object.assign(e as Error,{status:400})}
  result=await client.rpc('perform_farm_action',{p_user:user.id,p_request:request.requestId,p_action:action});
 }else throw Object.assign(new Error('Không tìm thấy API.'),{status:404});
 if(result.error)throw Object.assign(new Error(result.error.code==='P0001'?result.error.message:'Không kết nối được dữ liệu nông trại. Vui lòng thử lại.'),{status:result.error.code==='P0001'?409:result.status>=400?result.status:503});
 return result.data as T;
}
