import test from 'node:test';
import assert from 'node:assert/strict';
import { readCharacterBody } from '../src/character-request-body.js';
test('streaming body limit counts UTF-8 bytes and cancels oversized streams', async () => {
  let cancelled=false;
  const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('あ'.repeat(3000)));},cancel(){cancelled=true;}});
  const request=new Request('https://test',{method:'POST',body:stream,duplex:'half'});
  await assert.rejects(readCharacterBody(request),{code:'BODY_TOO_LARGE'});assert.equal(cancelled,true);
});
test('split UTF-8 is decoded correctly, malformed encoding and declared oversize are rejected', async () => {
  const bytes=new TextEncoder().encode('あ');
  const stream=new ReadableStream({start(c){c.enqueue(bytes.slice(0,1));c.enqueue(bytes.slice(1));c.close();}});
  assert.equal(await readCharacterBody(new Request('https://test',{method:'POST',body:stream,duplex:'half'})),'あ');
  await assert.rejects(readCharacterBody(new Request('https://test',{method:'POST',body:new Uint8Array([255])})),{code:'INVALID_JSON'});
  await assert.rejects(readCharacterBody(new Request('https://test',{method:'POST',body:'{}',headers:{'content-length':'9000'}})),{code:'BODY_TOO_LARGE'});
});
