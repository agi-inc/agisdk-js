# REAL Evals API Documentation

This document describes the API functions available for interacting with the REAL Evals platform.
Below is where you will find your API keys: https://www.realevals.xyz/profile

API keys are used to make submissions to the REAL Evals platform.

There are currently two main APIs:

1. `get_run_id`: Registers a new evaluation run on the REAL Evals platform and returns a unique run ID.
2. `get_run_results`: Retrieves the results of a previously registered evaluation run.

## Functions

### `get_run_id(api_key: string, model_name: string, run_name: string): Promise<string>`

Registers a new evaluation run on the REAL Evals platform and returns a unique run ID.

#### Parameters:
- `api_key` (string): Your REAL Evals API key for authentication
- `model_name` (string): Name of the model being evaluated
- `run_name` (string): A descriptive name for this evaluation run

#### Returns:
- `Promise<string>`: A unique run ID that can be used for submitting task results

#### Example:
```typescript
const url = `https://www.realevals.xyz/api/runKey?` +
    new URLSearchParams({
        api_key: api_key,
        model_name: model_name,
        run_name: run_name,
    }).toString();

const response = await fetch(url);
const data = await response.json();
const runId = data.newRunId;
```

#### Notes:
- The run ID is required for submitting task results
- Each run should have a unique run name for easy identification
- The API endpoint used is `https://www.realevals.xyz/api/runKey`

### `get_run_results(api_key: string, display_name: string): Promise<any>`

Retrieves the results of a previously registered evaluation run.

#### Parameters:
- `api_key` (string): Your REAL Evals API key for authentication
- `display_name` (string): The display name of the run to retrieve results for

#### Returns:
- `Promise<any>`: An object containing detailed results of the evaluation run, including:
  - `run_id`: Unique identifier for the run
  - `model_id`: Identifier for the model used
  - `success_rate`: Overall success rate as a percentage
  - `total_runs`: Total number of tasks executed
  - `created_at`: Timestamp when the run was created
  - `runs`: List of individual task results containing:
    - `task_id`: Identifier for the task
    - `retrieved_answer`: The answer provided by the model
    - `evals_passed`: Number of evaluation criteria passed
    - `evals_failed`: Number of evaluation criteria failed
    - `points`: Points earned for the task
    - `accuracy`: Accuracy score for the task
    - `completed_at`: Timestamp when the task was completed
    - `final_state`: Final state of the task execution

#### Example:
```typescript
const url = `https://www.realevals.xyz/api/getRunTask?` +
    new URLSearchParams({
        api_key: api_key,
        display_name: display_name,
    }).toString();

const response = await fetch(url);
const data = await response.json();
```

## JavaScript SDK Implementation

Note: Leaderboard submission is not yet fully implemented in the JavaScript SDK. The Python SDK includes full leaderboard integration. For now, you can:

1. Run tasks locally and save results
2. Manually submit results using the API endpoints above
3. Wait for full leaderboard integration to be added

See `example/leaderboard.ts` for a template of how leaderboard submission will work once implemented.

