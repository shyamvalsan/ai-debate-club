# AI Debate Club

A platform for simulating and evaluating structured debates between state-of-the-art language models.

## Overview

AI Debate Club creates a competitive environment where different language models engage in formal debates on user-provided topics. The platform facilitates structured discourse, provides objective evaluation from a panel of AI judges, and maintains ELO rankings to track performance over time.

## Features

- **Model Selection**: Choose from a curated list of cutting-edge language models to participate in debates
- **Topic Flexibility**: Select from pre-defined debate topics or create your own
- **Standardized Format**: Debates follow established debate rules and formats
- **Blind Judging**: An impartial panel of language models evaluates debates without knowing which model produced which argument
- **User Participation**: Users can submit their own judgments before seeing the official results to better understand bias
- **Performance Analytics**: ELO rating system tracks and displays model performance over time
- **Export Capability**: Export debates to Markdown format for sharing or publication

## Architecture

The project consists of a CLI-based backend that includes:

1. **Core Debate Engine**: Manages debate creation, format, and execution
2. **Model Integration**: Connects to various LLM providers (Anthropic, OpenAI, Groq)
3. **Judging System**: Evaluates debates using criteria like argument quality and evidence use
4. **ELO Rating System**: Tracks model performance over time

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- API keys for:
  - OpenAI
  - Anthropic
  - Groq

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-debate-club.git
   cd ai-debate-club
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` with your API keys:
   ```bash
   cp .env.example .env
   # Edit the .env file to add your API keys
   ```

4. Install the CLI globally (optional):
   ```bash
   npm install -g .
   ```

### Running a Debate (CLI)

The CLI provides several commands for working with debates:

#### List Available Models

```bash
npm run debate -- models

# or if installed globally
ai-debate-club models
```

#### List Debate Formats

```bash
npm run debate -- formats

# or if installed globally
ai-debate-club formats
```

#### Start a New Debate

```bash
npm run debate -- new

# or if installed globally
ai-debate-club new
```

#### List Past Debates

```bash
npm run debate -- list

# or if installed globally
ai-debate-club list
```

#### View a Past Debate

```bash
npm run debate -- view <debate-id>

# or if installed globally
ai-debate-club view <debate-id>
```

#### Judge an Existing Debate

```bash
npm run debate -- judge <debate-id>

# or if installed globally
ai-debate-club judge <debate-id>
```

#### View ELO Rankings

```bash
npm run debate -- rankings

# or if installed globally
ai-debate-club rankings
```

#### Export a Debate to Markdown

```bash
npm run debate -- export <debate-id>

# or if installed globally
ai-debate-club export <debate-id>
```

## Supported LLM Models

The platform currently supports the following models:

### Anthropic
- Claude Sonnet 3.7
- Claude Sonnet 3.7 (Thinking)
- Claude Sonnet 3.5
- Claude Opus 3

### OpenAI
- GPT-4o
- GPT-4.5 Preview
- O1
- O3 Mini

### Groq
- Llama 3.3 70B Versatile
- DeepSeek R1 Distill Llama 70B
- Mistral Saba 24B

## Debate Formats

- **Standard**: A structured format with opening statements, rebuttals, counter-rebuttals, and closing statements
- **Short**: A condensed format with only opening and closing statements
- **Comprehensive**: An extended format with multiple rounds of rebuttals and counter-rebuttals

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
