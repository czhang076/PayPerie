/**
 * x402 AI Agent - Interactive Chat Interface
 * 
 * Uses Google Gemini to process natural language purchase requests.
 * 
 * Example commands:
 * - "Show me what products are available"
 * - "Buy me a t-shirt"
 * - "Purchase the jeans please"
 * - "What's my spending limit?"
 */

import { GoogleGenerativeAI, SchemaType, type FunctionDeclarationsTool, type Part } from '@google/generative-ai';
import * as readline from 'readline';
import { config } from './config/index.js';
import { executeTool } from './client/index.js';
import { getWalletAddress } from './signer/index.js';

const genAI = new GoogleGenerativeAI(config.google.apiKey);

const SYSTEM_PROMPT = `You are a helpful AI shopping assistant that can help users browse and purchase products using cryptocurrency payments.

You have access to a wallet and can make purchases on behalf of the user using the x402 payment protocol.

Your capabilities:
1. List available products from the merchant store
2. Get details about specific products
3. Purchase products using USDC cryptocurrency
4. Check the user's spending policy and limits
5. Authorize merchants for automatic payments

When a user wants to buy something:
1. First, list the products or get product details to confirm availability
2. Then use the purchase_product tool to complete the purchase
3. Report the result including the transaction hash if successful

Always confirm the product and price before making a purchase.
Be helpful and conversational while keeping responses concise.`;

// Tool definitions for Gemini
const tools: FunctionDeclarationsTool[] = [
  {
    functionDeclarations: [
      {
        name: 'list_products',
        description: 'List all available products from the merchant store',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_product',
        description: 'Get details of a specific product by ID',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            productId: {
              type: SchemaType.STRING,
              description: 'The product ID to look up',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'purchase_product',
        description: 'Purchase a product using cryptocurrency (USDC). This will create a payment authorization, validate it through the Payment Facilitator, and execute the on-chain transaction.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            productId: {
              type: SchemaType.STRING,
              description: 'The product ID to purchase',
            },
          },
          required: ['productId'],
        },
      },
      {
        name: 'get_spending_policy',
        description: 'Get the current spending policy and limits for the user wallet',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'authorize_merchant',
        description: 'Authorize a merchant address for automatic payments',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            merchantAddress: {
              type: SchemaType.STRING,
              description: 'The merchant wallet address to authorize (0x...)',
            },
          },
          required: ['merchantAddress'],
        },
      },
    ],
  },
];

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: SYSTEM_PROMPT,
  tools,
});

const chat = model.startChat({
  history: [],
});

async function processMessage(userMessage: string): Promise<string> {
  let result = await chat.sendMessage(userMessage);
  let response = result.response;

  // Handle function calls
  while (response.functionCalls() && response.functionCalls()!.length > 0) {
    const functionCalls = response.functionCalls()!;
    const functionResponses: Part[] = [];

    for (const call of functionCalls) {
      console.log(`\n🔧 Using tool: ${call.name}`);
      const toolResult = await executeTool(call.name, call.args as Record<string, unknown>);
      
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: toolResult },
        },
      });
    }

    // Send function results back to the model
    result = await chat.sendMessage(functionResponses);
    response = result.response;
  }

  return response.text();
}

async function main(): Promise<void> {
  const walletAddress = getWalletAddress(config.user.privateKey);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   🤖  x402 AI Shopping Agent (Gemini)                        ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║   👛  Wallet: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}               ║`);
  console.log(`║   🏪  Merchant: ${config.services.merchantUrl}                 ║`);
  console.log(`║   💳  Facilitator: ${config.services.facilitatorUrl}              ║`);
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║   Try saying:                                                ║');
  console.log('║   • "Show me what products are available"                    ║');
  console.log('║   • "Buy me a t-shirt"                                       ║');
  console.log('║   • "What\'s my spending limit?"                              ║');
  console.log('║                                                              ║');
  console.log('║   Type "exit" to quit                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question('You: ', async (input) => {
      const userInput = input.trim();

      if (userInput.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        process.exit(0);
      }

      if (!userInput) {
        prompt();
        return;
      }

      try {
        console.log('\n🤔 Thinking...');
        const response = await processMessage(userInput);
        console.log(`\n🤖 Assistant: ${response}\n`);
      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
