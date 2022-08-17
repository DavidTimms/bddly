import { registerStep } from '.';

export function given<G>(precondition: () => Promise<G>): Given<G> {
  return new Given(null, precondition);
}

class Given<Curr, Prev = unknown> {
  private precondition: (state: Prev) => Promise<Curr>;

  constructor(private previous: Given<Prev, any> | null, precondition: (state: Prev) => Promise<Curr>) {
    this.precondition = precondition;
  }

  and<Next>(precondition: (state: Curr) => Promise<Next>): Given<Next, Curr> {
    return new Given(this, precondition);
  }

  when<Next>(action: (state: Curr) => Promise<Next>): When<Next, Curr> {
    return new When(this, action);
  }

  async _run(): Promise<Curr> {
    if (this.previous) {
      const state = await this.previous._run();
      registerStep('And', this.precondition);
      return this.precondition(state);
    } else {
      const state = null as unknown as Prev;
      registerStep('Given', this.precondition);
      return this.precondition(state);
    }
  }
}

class When<Curr, Prev> {
  constructor(private given: Given<Prev, any>, private action: (state: Prev) => Promise<Curr>) {}

  then<Next>(assertion: (state: Curr) => Promise<Next>): Then<Next, Curr> {
    return new Then(this, assertion);
  }

  async _run(): Promise<Curr> {
    const state: Prev = await this.given._run();
    registerStep('When', this.action);
    return this.action(state);
  }
}

class Then<Curr, Prev> {
  constructor(private when: When<Prev, any>, private assertion: (state: Prev) => Promise<Curr>) {}

  async run(): Promise<void> {
    const state: Prev = await this.when._run();
    registerStep('Then', this.assertion);
    await this.assertion(state);
  }
}
