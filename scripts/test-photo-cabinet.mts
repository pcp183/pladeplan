import assert from 'node:assert/strict';
import { decodePhotoPayload } from '../lib/photo-image.ts';
import {
  canUsePhotoCabinet,
  isPhotoAllowlisted,
  parseAllowlist,
  photoAiConfigured,
  photoModel,
  safeCabinetNote,
  DEFAULT_PHOTO_MODEL,
} from '../lib/photo-access.ts';
import { resetPhotoRateLimit, takePhotoSlot } from '../lib/photo-rate.ts';

const allow = parseAllowlist(' user_123 , Owner@Example.com , ');
assert.deepEqual(allow, ['user_123', 'Owner@Example.com']);
assert.equal(isPhotoAllowlisted('user_123', [], allow), true);
assert.equal(isPhotoAllowlisted('user_999', ['owner@example.com'], allow), true);
assert.equal(isPhotoAllowlisted('user_999', ['other@example.com'], allow), false);
assert.equal(isPhotoAllowlisted('user_123', [], []), false);

assert.equal(canUsePhotoCabinet({ billingReady: false, pro: false, allowlisted: false }), false);
assert.equal(canUsePhotoCabinet({ billingReady: false, pro: true, allowlisted: false }), false);
assert.equal(canUsePhotoCabinet({ billingReady: false, pro: false, allowlisted: true }), true);
assert.equal(canUsePhotoCabinet({ billingReady: true, pro: true, allowlisted: false }), true);
assert.equal(canUsePhotoCabinet({ billingReady: true, pro: false, allowlisted: false }), false);
assert.equal(canUsePhotoCabinet({ billingReady: true, pro: false, allowlisted: true }), true);

assert.equal(photoAiConfigured({} as NodeJS.ProcessEnv), false);
assert.equal(photoAiConfigured({ AI_GATEWAY_API_KEY: ' gw_test ' } as NodeJS.ProcessEnv), true);
assert.equal(photoAiConfigured({ VERCEL_OIDC_TOKEN: 'oidc' } as NodeJS.ProcessEnv), true);
assert.equal(photoAiConfigured({} as NodeJS.ProcessEnv, ' header-token '), true);
assert.equal(photoModel({} as NodeJS.ProcessEnv), DEFAULT_PHOTO_MODEL);
assert.equal(photoModel({ PHOTO_CABINET_MODEL: 'openai/gpt-4.1-mini' } as NodeJS.ProcessEnv), 'openai/gpt-4.1-mini');
assert.equal(photoModel({ PHOTO_CABINET_MODEL: 'not a model' } as NodeJS.ProcessEnv), DEFAULT_PHOTO_MODEL);

assert.equal(safeCabinetNote('Et hvidt skab i tre fag.'), 'Et hvidt skab i tre fag.');
assert.match(safeCabinetNote('Skabet koster 499 kr.'), /Kontrollér målene/);
assert.match(safeCabinetNote('   '), /Kontrollér målene/);

const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const decoded = decodePhotoPayload({ mediaType: 'image/png', imageBase64: png });
assert.equal(decoded.ok, true);
if (decoded.ok) assert.equal(decoded.photo.mediaType, 'image/png');
const fromUrl = decodePhotoPayload({ imageBase64: `data:image/png;base64,${png}` });
assert.equal(fromUrl.ok, true);
assert.equal(decodePhotoPayload({ mediaType: 'image/gif', imageBase64: png }).ok, false);
assert.equal(decodePhotoPayload({ mediaType: 'image/jpeg', imageBase64: '' }).ok, false);
assert.equal(decodePhotoPayload({ mediaType: 'image/jpeg', imageBase64: '@@@@' }).ok, false);

resetPhotoRateLimit();
const start = 1_000_000;
for (let i = 0; i < 8; i += 1) assert.equal(takePhotoSlot('user', start + i).ok, true);
const blocked = takePhotoSlot('user', start + 8);
assert.equal(blocked.ok, false);
if (!blocked.ok) assert.ok(blocked.retryAfterSec > 0);
assert.equal(takePhotoSlot('other', start).ok, true);
assert.equal(takePhotoSlot('user', start + 10 * 60 * 1000).ok, true);

console.log('photo cabinet tests ok');
