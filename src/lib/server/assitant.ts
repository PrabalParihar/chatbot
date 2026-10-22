import { ASSISTANT_ID, OPENAI_API_KEY } from '$env/static/private';
import OpenAI from 'openai';

const ai = new OpenAI({ apiKey: OPENAI_API_KEY });

const createThread = async (prompt: string): Promise<{ conversationId: string; firstMessage: string }> => {
	const conversation = await ai.conversations.create({
		items: [
			{ role: 'user', content: prompt }
		]
	});

	return { conversationId: conversation.id, firstMessage: prompt };
};

export const askQuestion = async (
	question: string,
	threadId?: string
): Promise<{ answer: string; threadId: string }> => {
	// TODO(landpatch): set OPENAI_MODEL and OPENAI_INSTRUCTIONS. Stored assistant: ASSISTANT_ID from env.
	const model = process.env.OPENAI_MODEL;
	const instructions = process.env.OPENAI_INSTRUCTIONS;
	if (!model || !instructions) {
		throw new Error(`Set OPENAI_MODEL and OPENAI_INSTRUCTIONS. Stored assistant: ${ASSISTANT_ID}.`);
	}

	let conversationId: string | undefined;
	let input: string;

	if (threadId) {
		conversationId = threadId;
		input = question;
	} else {
		const result = await createThread(question);
		conversationId = result.conversationId;
		input = result.firstMessage;
		threadId = conversationId;
	}

	console.log('Working on question', question);
	const response = await ai.responses.create({
		model,
		instructions,
		conversation: conversationId,
		input
	});

	console.log('Check status of run', response.id);
	console.time(response.id);
	console.timeEnd(response.id);

	if (response.status !== 'completed') {
		throw new Error(`Failed with unexpected status: ${response.status}`);
	}

	if (!response.output_text) {
		console.error("System didn't produce a text");
		throw new Error('Wrong content type');
	}

	return { answer: response.output_text, threadId };
};
