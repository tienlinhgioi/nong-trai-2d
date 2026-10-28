import { test,expect } from '@playwright/test';
test('Pages chạy tại đường dẫn con, có config đăng nhập và chơi thử lưu được',async({page})=>{
 const failed:string[]=[];const apiCalls:string[]=[];
 page.on('pageerror',e=>failed.push(e.message));
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiCalls.push(r.url())});
 await page.goto('/pages/');
 await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Chơi thử không cần đăng nhập'}).click();
 await expect(page.locator('canvas')).toBeVisible();
 await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');
 await page.keyboard.press('e');await expect(page.getByRole('status')).toContainText('Đã gieo hạt');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nong-trai-demo-v1')||'null')?.seeds.carrot)).toBe(4);
 await page.reload();await page.getByRole('button',{name:'Chơi thử không cần đăng nhập'}).click();
 await expect(page.getByRole('button',{name:'Hạt Cà rốt'})).toContainText('4');
 expect(apiCalls).toEqual([]);expect(failed).toEqual([]);
});

test('đăng ký chuyển sang gửi lại xác nhận, đếm ngược và giữ URL Pages',async({page})=>{
 await page.clock.install();
 let signupCount=0,resendCount=0;
 await page.route('**/auth/v1/signup**',async route=>{signupCount++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'test-signup',aud:'authenticated',email:'test@example.invalid',identities:[]})})});
 await page.route('**/auth/v1/resend**',async route=>{resendCount++;expect(route.request().postDataJSON().type).toBe('signup');expect(route.request().postDataJSON().email).toBe('test@example.invalid');expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('http://127.0.0.1:8000/pages/');await route.fulfill({status:200,contentType:'application/json',body:'{}'})});
 await page.goto('/pages/');await page.getByRole('button',{name:'Tạo tài khoản mới',exact:true}).click();
 await page.getByLabel('Tên người làm vườn').fill('Test');await page.getByLabel('Email',{exact:true}).fill('test@example.invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill('Test-only-not-sent-123');await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Xác nhận email của bạn'})).toBeVisible();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('test@example.invalid');
 await expect(page.getByRole('button',{name:/Gửi lại sau/})).toBeDisabled();
 await page.clock.fastForward(61000);await page.getByRole('button',{name:'Gửi lại email xác nhận',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã yêu cầu gửi lại');expect(signupCount).toBe(1);expect(resendCount).toBe(1);
});

test('hiện lỗi giới hạn email thay vì báo đã gửi',async({page})=>{
 await page.route('**/auth/v1/resend**',route=>route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({code:'over_email_send_rate_limit',msg:'email rate limit exceeded'})}));
 await page.goto('/pages/');await page.getByRole('button',{name:'Chưa nhận email xác nhận?',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill('test@example.invalid');await page.getByRole('button',{name:'Gửi lại email xác nhận',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Supabase đang giới hạn gửi email');await expect(page.getByRole('status')).not.toContainText('Đã yêu cầu gửi lại');await expect(page.getByRole('button',{name:/Gửi lại sau/})).toBeDisabled();
});
