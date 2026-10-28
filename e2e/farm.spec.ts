import { test,expect } from '@playwright/test';
test('desktop: chơi thử, di chuyển, gieo, tưới và lưu sau reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Chơi thử không cần đăng nhập'}).click();
 await expect(page.getByText('Chơi thử · lưu trên máy')).toBeVisible();
 await expect(page.locator('canvas')).toBeVisible();
 await page.waitForTimeout(300);
 await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');
 // Character spawns at (10,10), moves to (10,9), faces the plot at (10,8).
 // Depending on frame alignment the held key may move twice, so step back if needed.
 await page.keyboard.press('e');await expect(page.getByRole('status')).toContainText('Đã gieo hạt');
 await page.getByRole('button',{name:'Bình tưới',exact:true}).click();await page.keyboard.press('e');await expect(page.getByRole('status')).toContainText('Đã tưới');
 await page.getByRole('button',{name:/Túi đồ/}).click();await expect(page.getByRole('dialog')).toContainText('Túi nông sản');await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Chơi thử không cần đăng nhập'}).click();
 await expect(page.getByRole('button',{name:'Hạt Cà rốt'})).toContainText('4');
 await page.screenshot({path:'/workspace/nong-trai-2d/screenshots/desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('mobile: không tràn màn hình, điều khiển cảm ứng và bảng xếp hạng demo',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Chơi thử không cần đăng nhập'}).click();
 await expect(page.getByRole('button',{name:'Lên',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'E · Tương tác',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:/Bảng xếp hạng/}).click();await expect(page.getByRole('dialog')).toContainText('Bản chơi thử không tham gia xếp hạng');await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.screenshot({path:'/workspace/nong-trai-2d/screenshots/mobile.png',fullPage:true});
});
