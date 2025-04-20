import './App.css';

import { useRef } from 'react';
import { Engine, getQuickJS, HttpPackage, Package } from 'vnmark-view';

import { Player } from './player';

function App() {
  const viewRef = useRef<HTMLDivElement>(null);

  const playPackage = async (package_: Package) => {
    const quickJs = await getQuickJS();
    const engine = new Engine(package_, quickJs);
    const player = new Player(viewRef.current!, engine);
    await player.init();
    try {
      await engine.execute();
    } finally {
      player.destroy();
    }
  };

  return (
    <>
      <div>
        {/*<input*/}
        {/*  type="file"*/}
        {/*  onChange={event => {*/}
        {/*    const file = event.target.files!.item(0);*/}
        {/*    if (file) {*/}
        {/*      loadVnmZip(file);*/}
        {/*    }*/}
        {/*  }}*/}
        {/*/>*/}
        <button
          onClick={async event => {
            event.preventDefault();
            //// @ts-expect-error TS2339
            //const directory = await window.showDirectoryPicker();
            (event.target as HTMLElement).remove();
            //await playPackage(await FileSystemPackage.read(directory));
            await playPackage(await HttpPackage.read('flowers_01r'));
          }}>
          Load
        </button>
      </div>
      <div ref={viewRef} />
    </>
  );
}

export default App;
