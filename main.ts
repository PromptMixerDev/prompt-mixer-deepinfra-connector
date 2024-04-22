import OpenAI from 'openai';
import { config } from './config.js';
import { ChatCompletion } from 'openai/resources';

const API_KEY = 'API_KEY';

interface Message {
  role: string;
  content: string;
}

interface Completion {
  Content: string | null;
  Error?: string | undefined;
  TokenUsage: number | undefined;
}

interface ConnectorResponse {
  Completions: Completion[];
  ModelType: string;
}

interface ErrorCompletion {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error: string,
  model: string;
  usage: undefined;
}

const mapToResponse = (
  outputs: Array<ChatCompletion | ErrorCompletion>,
  model: string,
): ConnectorResponse => {
  return {
    Completions: outputs.map((output) => {
      if ('error' in output) {
        return {
          Content: null,
          TokenUsage: undefined,
          Error: output.error,
        };
      } else {
        return {
          Content: output.choices[0]?.message?.content,
          TokenUsage: output.usage?.total_tokens,
        };
      }
    }),
    ModelType: outputs[0].model || model,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapErrorToCompletion = (error: any, model: string): ErrorCompletion => {
  const errorMessage = error.message || JSON.stringify(error);
  return {
    choices: [],
    error: errorMessage,
    model,
    usage: undefined,
  };
};

async function main(
  model: string,
  prompts: string[],
  properties: Record<string, unknown>,
  settings: Record<string, unknown>,
) {
  const openai = new OpenAI({
    apiKey: settings?.[API_KEY] as string,
    baseURL: 'https://api.deepinfra.com/v1/openai',
  });

  const total = prompts.length;
  const { prompt, ...restProperties } = properties;
  const systemPrompt = (prompt ||
    config.properties.find((prop) => prop.id === 'prompt')?.value) as string;

  const messageHistory: Message[] = [{ role: 'system', content: systemPrompt }];
  const outputs: Array<ChatCompletion | ErrorCompletion> = [];

  try {
    for (let index = 0; index < total; index++) {
      try {
        messageHistory.push({ role: 'user', content: prompts[index] });
        // Cast messageHistory to the expected type if needed
        const chatCompletion = await openai.chat.completions.create({
          messages: messageHistory as unknown as [],
          model,
          ...restProperties,
        });
        outputs.push(chatCompletion);

        // Handling potential null value in assistantResponse
        const assistantResponse =
          chatCompletion.choices[0].message.content || 'No response.'; // Provide a default value
        messageHistory.push({ role: 'assistant', content: assistantResponse });

        console.log(
          `Response to prompt ${index + 1} of ${total}:`,
          chatCompletion,
        );
      } catch (error) {
        const completionWithError = mapErrorToCompletion(error, model);
        outputs.push(completionWithError);
      }
    }

    return mapToResponse(outputs, model);
  } catch (error) {
    console.error('Error in main function:', error);
    return { Error: error, ModelType: model };
  }
}

export { main, config };