import { rotationTestSetup, rotationTestTeardown, testRejectsTimeline } from "./utils";

beforeEach(rotationTestSetup);
afterEach(rotationTestTeardown);

// Technically BLU can't be lvl 100, but I was lazy when I wrote the test
// Tests the CD of surpanakha
it("rejects historical format: blu_surpanakha_spam.txt", testRejectsTimeline("blu_surpanakha_spam.txt"));

// Makes sure that the unscaled dot potencies from apokalypsis + phantom flurry are calculated correctly
it("rejects historical format: blu_channel_potencies.txt", testRejectsTimeline("blu_channel_potencies.txt"));
