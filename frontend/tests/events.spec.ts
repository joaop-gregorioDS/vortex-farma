import {test,expect} from '@playwright/test';
test('transactional outbox is published and consumed by RabbitMQ',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Adicionar Protetor solar facial',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Adicionar Protetor solar facial',exact:true}).click();
 await page.getByRole('link',{name:'Carrinho, 1 itens'}).click();
 await page.getByRole('button',{name:'Criar pedido simulado'}).click();
 await expect(page.locator('.order-card .badge')).toHaveText('Aguardando pagamento');
 await expect.poll(async()=>{const response=await page.request.get('/api/admin/dashboard');if(!response.ok())return 0;const d=await response.json();return Math.min(d.publishedEvents,d.processedEvents);},{timeout:20000,intervals:[500,1000,2000]}).toBeGreaterThanOrEqual(1);
});
