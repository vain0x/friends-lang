import Vue from 'vue';
import { Component } from 'vue-property-decorator';

@Component
export default class HomeComponent extends Vue {
  public knowledge: string = `\
    すごーい！ あなた が ヒトの フレンズ なら あなた は 定命の フレンズ なんだね！
    すごーい！ かばんちゃん は ヒトの フレンズ なんだね！
  `;
  public output: string = "";

  ask () {
    const body = new FormData();
    body.append("knowledge", this.knowledge);

    fetch("api/SampleData/Parse", { method: "POST", body })
    .then(response => response.text(), err => err)
    .then(text => {
      this.output = text;
    });
  }
}
