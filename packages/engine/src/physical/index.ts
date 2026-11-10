// Physical 2.0 (rules 1.12): melee techniques (Momentum) and ranged techniques (Pressure). Importing this file loads
// the rules and registers every handler.
export * from './types';
export * from './data';
export * from './pressure';
export * from './core';
export * from './rules';
export * from './ai';
export { loadQuiverWith, quiverLoader } from './ranged/quiver';
import './melee/index';
import './ranged/index';
import './guard';
