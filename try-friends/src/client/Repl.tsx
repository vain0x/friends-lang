import * as React from 'react';
import { Solution, Repl, Logger } from '../core/ast';
import { createFriendsLangRepl } from '../core/repl';
import { exhaust } from '../core/util';
import { FriendsLangPrinter } from '../core/printing';
import { flatMap } from '../core/iterable';

interface Statement {
  id: number;
  content: string;
}

type MessageType = 'rule' | 'query' | 'solution';

interface Message {
  key: number;
  type: MessageType;
  content: string;
}

interface ReplState {
  query: string;
  assignment: string;
  statements: Statement[];
  messages: Message[];
  errorMessage: string | undefined;
  repl: Repl;

  // FIXME: use immutable alternative
  iter: Iterator<Solution>;
}

class ConsoleLogger implements Logger {
  debug(value: {}): void {
    console.debug(prettyJsonify(value));
  }
}

const emptyIterator = () => [][Symbol.iterator]();

const prettyJsonify = (value: any) => JSON.stringify(value, undefined, 2);

const logger = new ConsoleLogger();

const printer = new FriendsLangPrinter();

let k = 0;

const item = (type: MessageType, content: string): Message => ({
  key: ++k,
  type,
  content,
});

const initialState: ReplState = {
  repl: createFriendsLangRepl(logger),
  query: 'すごーい！ あなた は 定命の フレンズ なんだね！',
  statements: [],
  assignment: 'No results.',
  iter: emptyIterator(),
  messages: [
    item('rule', 'すごーい！ あなた は 定命の フレンズ なんだね！'),
    item('rule', 'すごーい！ あなた が 人間の フレンズ なら あなた は 定命の フレンズ なんだね！'),
    item('query', 'だれ が 定命の フレンズ なんですか？'),
    item('solution', '定命の フレンズ は ソクラテス なのです'),
  ],
  errorMessage: '',
};

export class ReplComponent extends React.Component<{}, ReplState> {
  constructor(props: {}) {
    super(props);

    this.state = initialState;
  }

  private setQuery(query: string) {
    this.setState({ query });
  }

  private post(message: Message) {
    this.setState(state => ({ messages: [...state.messages, message] }));
  }

  private onAsk() {
    logger.debug('onAsk');

    const { query, repl, statements } = this.state;

    const content = query.trim();
    if (content === '') {
      return;
    }

    const r = repl.input(query);
    if ('err' in r) {
      this.setState({ errorMessage: r.err });
      return;
    } else if ('accepted' in r) {
      const id = statements.length;
      this.setState(s => ({
        errorMessage: '',
        statements: [...statements, { id, content }],
      }));
      this.post(item('rule', content));
      return;
    } else if ('solutions' in r) {
      this.setState(s => ({
        errorMessage: '',
        iter: r.solutions[Symbol.iterator](),
      }));
      this.post(item('query', content));
      this.onNo();
      return;
    } else {
      return exhaust(r);
    }
  }

  private onYes() {
    logger.debug('onYes');
    this.setState({
      iter: emptyIterator(),
      errorMessage: 'このくらいは朝飯前なのです',
    });
  }

  private onNo() {
    logger.debug('onNo');

    const result = this.state.iter.next();
    logger.debug({ result });

    if (result.done) {
      this.setState({
        assignment: '',
        errorMessage: '解なしなのです',
      });
      this.post(item('solution', '解なしなのです'));
      return;
    }

    const solution = result.value;
    const bindings = [...flatMap(solution, t => {
      if ('term' in t) {
        return [t];
      } else {
        return [];
      }
    })];
    if (bindings.length === 0) {
      this.setState({
        assignment: '',
        errorMessage: 'そのようですね',
      });
      this.post(item('solution', 'そのようですね'));
    } else {
      const assignment = [
        ...flatMap(solution, t => 'term' in t
          ? [`${t.varName} は ${printer.printTerm(t.term)} 、`]
          : []),
        'なのです',
      ].join('\n');

      this.setState({ assignment });
      this.post(item('solution', assignment));
    }
  }

  render() {
    const { query, messages, errorMessage } = this.state;

    return (
      <article className='friends-repl'>
        <div className='stream'>
          {
            messages.map(message => (
              <div
                className='stream-item'
                key={message.key}
                data-type={message.type}
              >
                <div className='icon'></div>

                <div className='message'>
                  {message.content}
                </div>
              </div>
            ))
          }
        </div>


        <p>例: あなた は 定命の フレンズ なんですか？</p>
        <p>例: ソクラテスさん は 定命の フレンズ なんですか？</p>

        <form>
          <textarea
            className='friends-repl-editor friends-repl-panel'
            rows={8}
            onChange={ev => this.setQuery(ev.currentTarget.value)}
            value={query}
          />

          <button
            type='button'
            className='friends-repl-ask-button'
            onClick={() => this.onAsk()}
          >Ask</button>
        </form>

        <section>
          <form>
            <button
              type='button'
              className='friends-repl-yes-button'
              onClick={() => this.onYes()}
            >Yes</button>

            <button
              type='button'
              className='friends-repl-no-button'
              onClick={() => this.onNo()}
            >No</button>
          </form>

          <div
            className='friends-repl-solution friends-repl-panel'
          >{this.state.assignment}</div>

          {
            errorMessage && <div
              className='friends-repl-error friends-repl-panel'
            >{errorMessage}</div>
          }

          <h4>知識: </h4>

          <ol>
            {
              this.state.statements.map(stmt => (
                <li key={stmt.id}>{stmt.content}</li>
              ))
            }
          </ol>
        </section>
      </article>
    );
  }
}
