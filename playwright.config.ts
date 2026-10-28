import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',timeout:30000,workers:1,use:{baseURL:'http://127.0.0.1:8787',headless:true,launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']},screenshot:'only-on-failure'},reporter:'list'});
