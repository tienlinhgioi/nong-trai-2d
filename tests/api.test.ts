import { describe,it,expect } from 'vitest';
import { api } from '../server/index';
describe('API boundary',()=>{
 it('báo chưa cấu hình, không làm giả đăng nhập',async()=>{const r=await api(new Request('https://farm.test/api/config'),{});expect(await r.json()).toEqual({configured:false,url:null,key:null});expect((await api(new Request('https://farm.test/api/farm'),{})).status).toBe(503)});
 it('không trả secret trong config',async()=>{const r=await api(new Request('https://farm.test/api/config'),{SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'publishable'});expect(await r.json()).toEqual({configured:true,url:'https://example.supabase.co',key:'publishable'})});
 it('chặn thiếu token và request khác origin',async()=>{const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'publishable'};expect((await api(new Request('https://farm.test/api/farm'),env)).status).toBe(401);expect((await api(new Request('https://farm.test/api/actions',{method:'POST',headers:{Origin:'https://evil.test'}}),env)).status).toBe(403)})
});
