import {command,seed,validateDocument} from './core.js';
export const STORAGE_KEY='fixtrace.demo.v1';
export function readStore(storage) {
  const raw=storage.getItem(STORAGE_KEY);
  if(raw===null){const doc=seed();storage.setItem(STORAGE_KEY,JSON.stringify(doc));return doc;}
  try{return validateDocument(JSON.parse(raw));}catch(error){throw new Error(`Cannot load saved demo. ${error.message}`);}
}
export function commitStore(storage,expected,action,role,now=Date.now()) {
  const raw=storage.getItem(STORAGE_KEY);
  const current=raw===null?null:validateDocument(JSON.parse(raw));
  if(!current||JSON.stringify(current)!==JSON.stringify(expected)) throw new Error('Another tab changed this demo. Reload the latest data before saving. Your form stays open.');
  const next=command(current,action,role,now);
  storage.setItem(STORAGE_KEY,JSON.stringify(next)); // throwing prevents publication of next state
  return next;
}
