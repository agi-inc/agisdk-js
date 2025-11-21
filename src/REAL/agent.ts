import { type Obs } from './env.js';

export interface Agent {
    getAction(obs: Obs): Promise<string>;
}

