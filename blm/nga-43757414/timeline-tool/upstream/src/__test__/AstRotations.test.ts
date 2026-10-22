import { rotationTestSetup, rotationTestTeardown, testRejectsTimeline } from "./utils";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

it("rejects historical format: ast_100_opener_and_heal.txt", testRejectsTimeline("ast_100_opener_and_heal.txt"));
