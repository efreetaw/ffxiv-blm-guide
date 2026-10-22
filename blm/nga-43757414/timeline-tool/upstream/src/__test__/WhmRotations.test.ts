import { rotationTestSetup, rotationTestTeardown, testRejectsTimeline } from "./utils";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

it("rejects historical format: whm_100_opener_and_lilies.txt", testRejectsTimeline("whm_100_opener_and_lilies.txt"));
