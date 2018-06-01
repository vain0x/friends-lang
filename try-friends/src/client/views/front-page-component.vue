<template>
  <article class="friends-repl">
    <h2>Try Friends-lang</h2>

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

      <div class="friends-repl-solution friends-repl-panel">{{ assignment }}</div>
    </section>
  </article>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  background: #cceeff;
}

.friends-repl {
  margin: 0 auto;
  width: 640px;
}

.friends-repl-panel {
  background: #fbfbfb;

  margin: 16px 0;
  padding: 13px;
  border: solid 2px #f6a20e;
}

.friends-repl-editor {
  width: 100%;
}

.friends-repl-solution {
  min-height: 120px;
  max-height: 240px;
  white-space: pre-wrap;
  font-family: monospace;
}

.friends-repl button {
  width: 84px;
  height: 30px;
}

.friends-repl-ask-button {
  background: #f6a20e;
  font-weight: 900;
}

.friends-repl-yes-button {
  color: #008000;
}

.friends-repl-no-button {
  color: #000080;
}
</style>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { message } from "../../core/awesome";

@Component
export default class FrontPageComponent extends Vue {
  @Prop() name: string;
  @Prop() initialEnthusiasm: number;

  private assignment: string = "No results.";
  private query: string = "すごーい！ あなたは 定命の フレンズ なんだね！";
  private iter: Iterator<object> = [{}][Symbol.iterator]();

  onAsk() {
    console.debug("onAsk");
    this.iter = this.query.split(" ").map(x => ({ x }))[Symbol.iterator]();

    this.onNo();
  }

  onYes() {
    console.debug("onYes");
  }

  onNo() {
    console.debug("onNo");
    const result = this.iter.next();
    if (result.done) {
      this.assignment = "No results.";
    } else {
      this.assignment = JSON.stringify(result.value, undefined, 2);
    }
  }
}
</script>
