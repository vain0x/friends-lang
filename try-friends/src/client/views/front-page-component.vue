<template>
  <article>
    <h2>Try Friends-lang</h2>

    <p>
      {{ message }}
    </p>

    <form action="" method="POST">
      <textarea rows="8"/>
      <button type="button">Submit</button>
    </form>
  </article>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { message } from "../../core/awesome";

@Component
export default class FrontPageComponent extends Vue {
  @Prop() name: string;
  @Prop() initialEnthusiasm: number;

  private enthusiasm: number = this.initialEnthusiasm;

  increment () {
    this.enthusiasm++;
  }

  decrement () {
    if (this.enthusiasm > 1) {
      this.enthusiasm--;
    }
  }

  get exclamationMarks (): string {
    return Array(this.enthusiasm + 1).join("!");
  }
  get message () {
    return message();
  }
}
</script>
