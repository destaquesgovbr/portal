/**
 * Subscription GraphQL para o agente de geração de recortes (Fase B4).
 *
 * Substitui o proxy SSE em `POST /api/clipping/generate-recortes` quando a
 * feature flag `graphql.agent` está ON. O schema upstream é definido na
 * Fase A6 do `graphql-api`:
 *
 *   union AgentEvent =
 *       AgentEventThinking
 *     | AgentEventToolCall
 *     | AgentEventToolResult
 *     | AgentEventSampleResult
 *     | AgentEventAdjusting
 *     | AgentEventDone
 *     | AgentEventError
 *
 *   type Subscription {
 *     generateRecortes(prompt: String!): AgentEvent!
 *   }
 *
 * O payload `argsJson` / `resultJson` / `payloadJson` é serializado como
 * string JSON para evitar fan-out de tipos no schema (decisão A6).
 */

import { gql } from '@urql/core'

export const GENERATE_RECORTES_SUBSCRIPTION = gql`
  subscription GenerateRecortes($prompt: String!) {
    generateRecortes(prompt: $prompt) {
      __typename
      ... on AgentEventThinking {
        message
      }
      ... on AgentEventToolCall {
        iteration
        tool
        argsJson
      }
      ... on AgentEventToolResult {
        iteration
        tool
        resultJson
      }
      ... on AgentEventSampleResult {
        iteration
        payloadJson
      }
      ... on AgentEventAdjusting {
        message
      }
      ... on AgentEventDone {
        recortes {
          id
          title
          themes
          agencies
          keywords
        }
        explanation
        description
        suggestedName
        iterations
        converged
      }
      ... on AgentEventError {
        message
      }
    }
  }
`

// ---------- TypeScript shapes ----------

export type AgentEventGraphQL =
  | {
      __typename: 'AgentEventThinking'
      message: string
    }
  | {
      __typename: 'AgentEventToolCall'
      iteration: number
      tool: string
      /** JSON serializado com `{ recorte, filters: { themes, agencies, keywords } }`. */
      argsJson: string
    }
  | {
      __typename: 'AgentEventToolResult'
      iteration: number
      tool: string
      /** JSON serializado com `{ count, top_themes, top_agencies }`. */
      resultJson: string
    }
  | {
      __typename: 'AgentEventSampleResult'
      iteration: number
      /** JSON serializado com `{ count, articles: [{ title, summary, agency_name }] }`. */
      payloadJson: string
    }
  | {
      __typename: 'AgentEventAdjusting'
      message: string
    }
  | {
      __typename: 'AgentEventDone'
      recortes: Array<{
        id: string
        title: string
        themes: string[]
        agencies: string[]
        keywords: string[]
      }>
      explanation: string
      description: string
      suggestedName: string
      iterations: number
      converged: boolean | null
    }
  | {
      __typename: 'AgentEventError'
      message: string
    }

export interface GenerateRecortesSubscriptionData {
  generateRecortes: AgentEventGraphQL
}

export interface GenerateRecortesSubscriptionVariables {
  prompt: string
}
