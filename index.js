import dotenv from 'dotenv';
import {chromium} from 'playwright';
import prompt from 'prompt';
// eslint-disable-next-line no-unused-vars
import colors from '@colors/colors';
import {Command} from 'commander';

// import {ChatOpenAI} from 'langchain/chat_models/openai';
import {AzureChatOpenAI} from '@langchain/openai';
import {interactWithPage} from './actions/index.js';
import {createTestFile, gracefulExit} from './util/index.js';

dotenv.config();

async function main(options) {
  const url = options.url;
  const browser = await chromium.launch({headless: false});

  // Parse the viewport option
  const [width, height] = options.viewport.split(',').map(Number);

  const browserContext = await browser.newContext({
    viewport: {width, height},
  });

  const page = await browserContext.newPage();
  await page.goto(url);

  prompt.message = 'BrowserGPT'.green;
  prompt.delimiter = '>'.green;
  prompt.start();

  const azureChatApi_o1 = new AzureChatOpenAI({
    openAIApiKey: process.env['AZURE_OPENAI_API_KEY'],
    openAIApiVersion: '2024-12-01-preview',
    deploymentName: 'o1',
    azureOpenAIApiInstanceName: 'o1',
    azureOpenAIBasePath:
      process.env['AZURE_OPENAI_ENDPOINT'] + '/openai/deployments',
  });

  const azureChatApi_4o = new AzureChatOpenAI({
    openAIApiKey: process.env['AZURE_OPENAI_API_KEY'],
    openAIApiVersion: '2024-05-01-preview',
    deploymentName: 'gpt-4o',
    azureOpenAIApiInstanceName: 'gpt-4o',
    azureOpenAIBasePath:
      process.env['AZURE_OPENAI_ENDPOINT'] + '/openai/deployments',
  });

  if (options.outputFilePath) {
    createTestFile(options.outputFilePath);
  }

  process.on('exit', () => {
    gracefulExit(options);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const {task} = await prompt.get({
      properties: {
        task: {
          message: ' Input a task\n',
          required: false,
        },
      },
    });

    if (task === '') {
      console.log('Please input a task or press CTRL+C to exit'.red);
    } else if (task.includes('o1')) {
      console.log('o1 task:', task.split('o1')[0]);
      const splited_task = task.split('o1')[0];
      try {
        await interactWithPage(azureChatApi_o1, page, splited_task, options);
      } catch (e) {
        console.log('Execution failed');
        console.log(e);
      }
    } else {
      try {
        await interactWithPage(azureChatApi_4o, page, task, options);
      } catch (e) {
        console.log('Execution failed');
        console.log(e);
      }
    }
  }
}

const program = new Command();

program
  .option('-o, --outputFilePath <outputFilePath>', 'path to store test code')
  .option('-u, --url <url>', 'url to start on', 'https://www.google.com')
  .option('-v, --viewport <viewport>', 'viewport size to use', '1280,720');

program.parse();

main(program.opts());
