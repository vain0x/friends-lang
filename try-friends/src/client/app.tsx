import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ReplComponent } from './Repl';
import { AppLayout } from './AppLayout';

ReactDOM.render(
  <AppLayout>
    <ReplComponent />
  </AppLayout>,
  document.getElementById('app'),
);
