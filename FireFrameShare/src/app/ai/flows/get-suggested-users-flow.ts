'use server';
/**
 * @fileOverview An AI flow to get user suggestions.
 *
 * - getSuggestedUsers - A function that returns a list of suggested users.
 * - GetSuggestedUsersInput - The input type for the getSuggestedUsers function.
 * - GetSuggestedUsersOutput - The return type for the getSuggestedUsers function.
 */

import {ai} from '../genkit';
import {z} from 'zod';

const SuggestedUserSchema = z.object({
  username: z.string().describe('The username of the suggested user.'),
  avatarUrl: z.string().describe('The URL of the user\'s avatar image.'),
  reason: z.string().describe('A short reason why this user is being suggested.'),
});
export type SuggestedUser = z.infer<typeof SuggestedUserSchema>;

const GetSuggestedUsersInputSchema = z.object({
  user: z.object({
    username: z.string().describe("The current user's username."),
    interests: z.string().describe("A summary of the user's interests, like 'photography, travel, nature'."),
  }),
});
export type GetSuggestedUsersInput = z.infer<typeof GetSuggestedUsersInputSchema>;

const GetSuggestedUsersOutputSchema = z.array(SuggestedUserSchema);
export type GetSuggestedUsersOutput = z.infer<typeof GetSuggestedUsersOutputSchema>;

export async function getSuggestedUsers(input: GetSuggestedUsersInput): Promise<GetSuggestedUsersOutput> {
  return getSuggestedUsersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getSuggestedUsersPrompt',
  input: {schema: GetSuggestedUsersInputSchema},
  output: {schema: GetSuggestedUsersOutputSchema},
  prompt: `You are a helpful assistant that suggests other users for someone to follow on a social media platform.
The platform is focused on creative content like images and photography.
Based on the current user's profile and interests, suggest 4 other users they might want to follow.
For each suggested user, provide a username, an avatar URL, and a short, compelling reason why the current user might like them.
The suggested users should have creative and interesting work related to the current user's interests.

Do not suggest the current user to themselves.

Current user:
Username: {{{user.username}}}
Interests: {{{user.interests}}}

Generate fictional but realistic-looking usernames.
For avatar URLs, use placeholder images from https://placehold.co/100x100.png.`,
});

const getSuggestedUsersFlow = ai.defineFlow(
  {
    name: 'getSuggestedUsersFlow',
    inputSchema: GetSuggestedUsersInputSchema,
    outputSchema: GetSuggestedUsersOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output || [];
  }
);
