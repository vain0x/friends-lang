import * as React from 'react';

export class AppLayout extends React.Component {
  render() {
    return (
      <article id='app-layout-component'>
        <header>
          <a href='/'>
            <img
              id='header-logo'
              width='874px'
              height='350px'
              alt='logo'
              src='/assets/logo.png'
            ></img>
          </a>
        </header>

        <main id='app-layout-main'>
          {this.props.children}
        </main>

        <footer>
          <a href='/about.html'>Try Friends-lang</a> powered by
          <a href='https://aratama.github.io/kemonogen/'>Kemono Friends Logo Generator</a>
          and <a href='https://www.flickr.com/photos/5lab/4004317022/'>Savanna</a>.
        </footer>
      </article>
    );
  }
}
