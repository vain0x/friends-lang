<template>
  <article class="friends-repl">
    <div class="stream">
      <div
        class="stream-item"
        v-for="message in messages"
        :key="message.key"
        :data-type="message.type"
      >
        <div class="icon"></div>

        <div class="message">
          {{ message.content }}
        </div>
      </div>
    </div>

    <p>例: あなた は 定命の フレンズ なんですか？</p>
    <p>例: ソクラテスさん は 定命の フレンズ なんですか？</p>

    <form>
      <textarea
        class="friends-repl-editor friends-repl-panel"
        rows="8"
        v-model="query"
        />

      <button
        type="button"
        class="friends-repl-ask-button"
        @click="onAsk"
      >Ask</button>
    </form>

    <section>
      <form>
        <button
          type="button"
          class="friends-repl-yes-button"
          @click="onYes"
        >Yes</button>

        <button
          type="button"
          class="friends-repl-no-button"
          @click="onNo"
        >No</button>
      </form>

      <div
        class="friends-repl-solution friends-repl-panel"
      >{{ assignment }}</div>

      <div
        v-if="errorMessage !== ''"
        class="friends-repl-error friends-repl-panel"
      >{{ errorMessage }}</div>

      <h4>知識: </h4>

      <ol>
        <li
          v-for="s in statements"
          :key="s.id"
        >{{s.content}}
        </li>
      </ol>
    </section>
  </article>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { message } from "../../core/awesome";
import { Solution, Repl, Logger } from "../../core/ast";
import { createFriendsLangRepl } from "../../core/repl";
import { exhaust } from "../../core/util";
import { FriendsLangPrinter } from "../../core/printing";
import { flatMap } from "../../core/iterable";

const emptyIterator = () => [][Symbol.iterator]();

const prettyJsonify = <T>(value: T) => JSON.stringify(value, undefined, 2);

class ConsoleLogger implements Logger {
  debug(value: {}): void {
    console.debug(prettyJsonify(value));
  }
}

const logger = new ConsoleLogger();

const printer = new FriendsLangPrinter();

let k = 0;

type MessageType = "rule" | "query" | "solution";

interface Message {
  key: number
  type: MessageType;
  content: string
}

const item = (type: MessageType, content: string): Message => ({
  key: ++k,
  type,
  content,
});

@Component
export default class FrontPageComponent extends Vue {
  @Prop() name: string;
  @Prop() initialEnthusiasm: number;

  private assignment: string = "No results.";
  private statements: { id: number, content: string }[] = [];
  private query: string = "すごーい！ あなた は 定命の フレンズ なんだね！";
  private iter: Iterator<Solution> = emptyIterator();
  private errorMessage: string = "";
  private repl: Repl = createFriendsLangRepl(logger);

  private messages = [
    item("rule", "すごーい！ あなた は 定命の フレンズ なんだね！"),
    item("rule", "すごーい！ あなた が 人間の フレンズ なら あなた は 定命の フレンズ なんだね！"),
    item("query", "だれ が 定命の フレンズ なんですか？"),
    item("solution", "定命の フレンズ は ソクラテス なのです"),
  ];

  post(message: Message) {
    this.messages = [...this.messages, message];
  }

  onAsk() {
    logger.debug("onAsk");

    const content = this.query.trim();
    if (content === "") {
      return;
    }

    const r = this.repl.input(this.query);
    if ("err" in r) {
      this.errorMessage = r.err;
      return;
    } else if ("accepted" in r) {
      this.errorMessage = "";
      const id = this.statements.length;
      this.statements = [...this.statements, { id, content }];

      this.post(item("rule", content));
      return;
    } else if ("solutions" in r) {
      this.errorMessage = "";
      this.iter = r.solutions[Symbol.iterator]();

      this.post(item("query", content));
      this.onNo();
      return;
    } else {
      return exhaust(r);
    }
  }

  onYes() {
    logger.debug("onYes");
    this.iter = emptyIterator();
    this.errorMessage = "このくらいは朝飯前なのです";
  }

  onNo() {
    logger.debug("onNo");

    const result = this.iter.next();
    logger.debug({ result });

    if (result.done) {
      this.assignment = "";
      this.errorMessage = "解なしなのです";

      this.post(item("solution", "解なしなのです"));
      return;
    }

    const solution = result.value;
    const bindings = [...flatMap(solution, t => {
      if ("term" in t) {
        return [t];
      } else {
        return [];
      }
    })];
    if (bindings.length === 0) {
      this.assignment = "";
      this.errorMessage = "そのようですね"

      this.post(item("solution", "そのようですね"));
    } else {
      this.assignment = [
        ...flatMap(solution, t => "term" in t
          ? [`${t.varName} は ${printer.printTerm(t.term)} 、`]
          : []),
        "なのです",
      ].join("\n");

      this.post(item("solution", this.assignment));
    }
  }
}
</script>
