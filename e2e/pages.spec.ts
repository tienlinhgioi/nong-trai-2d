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
 await page.reload();await page.getByRole('button',{name:'Chơi thử không cần đăng nhập'}).click();
 await expect(page.getByRole('button',{name:'Hạt Cà rốt'})).toContainText('4');
 expect(apiCalls).toEqual([]);expect(failed).toEqual([]);
});
