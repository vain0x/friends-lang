import { testSuite as awesome } from './awesome.spec';
import { testSuite as evaluating } from './evaluating';
import { testSuite as parsing } from './parsing';
import { runTests } from './testing';

runTests({
  awesome,
  parsing,
  evaluating,
});
