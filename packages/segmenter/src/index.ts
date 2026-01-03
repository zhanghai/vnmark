import process from 'node:process';

import { NodeFsPackage, Segmenter } from './segmenter';

async function main(arguments_: string[]): Promise<number> {
  if (arguments_.length !== 1) {
    process.stderr.write('Usage: segmenter <DIRECTORY>\n');
    return 1;
  }
  const [directory] = arguments_;
  const package_ = await NodeFsPackage.read(directory);
  const segmenter = new Segmenter(package_);
  await segmenter.init();
  await segmenter.segment();
  const segments = segmenter.segments;
  console.error(
    `${Object.keys(segments).length} segments, ${Object.values(segments).filter(it => !it.trivial).length} non-trivial`,
  );
  console.log(JSON.stringify(segmenter.segments, undefined, '  '));
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
