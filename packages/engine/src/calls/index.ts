// Calls (rules 1.13, Skeleton 2.0): the nine gamma skills' speech actions in a fight. Importing this file loads the
// rules and registers every handler and the enemy AI's step.
export * from './types';
export * from './data';
export * from './core';
export * from './rules';
export * from './ai';
export { orderMoveTiles } from './handlers';
import './handlers';
