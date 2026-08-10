'use strict';
const fs = require('fs');
const path = require('path');
const required = ['PADDLE_CLIENT_TOKEN','PADDLE_PRO_MONTHLY_PRICE_ID','PADDLE_PRO_ANNUAL_PRICE_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error('Missing Foundry Vault/environment values: ' + missing.join(', '));
  console.error('PADDLE_API_KEY is server-only and must never be emitted into this static site.');
  process.exit(1);
}
const environment = process.env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
if (environment === 'production' && !process.env.ALLOW_PRODUCTION_PADDLE_BUILD) {
  console.error('Production Paddle build refused. Set ALLOW_PRODUCTION_PADDLE_BUILD=1 only after sandbox QA.');
  process.exit(1);
}
const publicConfig = {
  environment,
  clientToken: process.env.PADDLE_CLIENT_TOKEN,
  monthlyPriceId: process.env.PADDLE_PRO_MONTHLY_PRICE_ID,
  annualPriceId: process.env.PADDLE_PRO_ANNUAL_PRICE_ID
};
fs.writeFileSync(path.join(__dirname, '..', 'funnel', 'paddle-config.js'), 'window.REPLYMIND_PADDLE = ' + JSON.stringify(publicConfig) + ';\n');
console.log('Generated funnel/paddle-config.js for Paddle ' + environment + ' (values intentionally redacted).');
