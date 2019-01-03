interface WaitForOptions {
  /**
   * How long to wait before we just give up and stop checking.
   */
  timeout: number;
  /**
   * If true then if the resolver doesn't resolve true in time it just stops trying rather than throwing an error.
   */
  silent?: boolean;
  /**
   * How often to check and see if the resolver passes, in milliseconds.
   */
  frequency?: number;
}

type Resolver = (context?: any) => boolean;

/**
 * Utility to poll a resolver in order to determine if a function should fire.
 * If the resolver does not pass before a timeout then the intended method will be undefined.
 *
 * ```ts
 * import WaitFor from 'waitfor.ts';
 *
 * let user;
 *
 * function resolver() {
 *  return user !== undefined;
 * }
 *
 * function WelcomeMessage(greet){
 *  console.log(`${greet} ${user}!`);
 * }
 *
 * const Wait = new WaitFor(resolver, WelcomeMessage);
 * Wait.fire('Welcome'); // nothing yet
 *
 * // Pretend Login after some validation and stuff
 * user = `Ben`;
 *
 * // Welcome Ben!
 *
 * ```
 */
class WaitFor {

  /**
   * Sets the time the method was originally attempted. This is used to determine timeout.
   */
  private firstInvoked: Date | undefined;
  /**
   * After this value has been exceeded the check will fail and stop trying.
   */
  private timeout: number;
  /**
   * If set to true then rather than throwing an error at timeout the class will simply stop trying to resolve the resolver.
   */
  private silent: boolean;
  /**
   * Reference for the timer method, unless the request is immediately resolved
   */
  private timerId: NodeJS.Timer | undefined;
  /**
   * How often should we poll and check the resolver if it didn't immediately return true.
   */
  private frequency: number;

  /**
   * @param {Resolver} resolveFn Method that must return true in order for the intended function to fire.
   * @param {Function} invokedFn Expected function. This method will fire after the resolver returns true.
   * @param {WaitForOptions} options Options that dictate timeout how the waitfor class behaves.
   */
  constructor(private resolveFn: Resolver, private invokedFn: Function, private options: WaitForOptions = {
    timeout: 1000
  }) {
    this.timeout = options.timeout;
    this.silent = options.silent! || false;
    this.frequency = options.frequency! || 10;
  }

  /**
   * Returns the amount of time, in milliseconds, that has elapsed since the original request.
   */
  private get sinceLast(): number {
    return Date.now() - this.firstInvoked!.getTime();
  }

  /**
   * Takes the amount of time that has elapsed since originally requested and determines if the call should time out.
   */
  private get timedOut(): boolean {
    return this.sinceLast >= this.timeout;
  }

  /**
   * Utility method used to create the polling timer.
   * It subsequently invokes, and clears the timer, or clears the timer and times out if the request has timed out.
   */
  private setTimer(...args:any[]): void {
    this.timerId = setInterval(() => {
      if (this.resolveFn()) {
        this.invokedFn.apply(this, args);
        this.clearTimer();
      } else {
        if (this.timedOut) {
          this.clearTimer();
          if (!this.silent) throw new Error('waitFor timeout');
        }
      }
    }, this.frequency);
  }

  /**
   * Clears the internal polling timer.
   */
  private clearTimer(): void {
    clearInterval(this.timerId!);
    this.timerId = undefined;
  }

  /**
   * Starts the request to the resolver, and if needed the polling timer.
   */
  fire(...args:any[]) {
    this.firstInvoked = new Date();
    if (this.resolveFn()) {
      this.invokedFn.apply(this, args);
    } else {
      this.setTimer.apply(this, args);
    }
  }

  /**
   * Helper method to require less 'boilerplate'.
   *
   * ```ts
   * import WaitFor from 'waitfor.ts';
   *
   * function resolverFn(): boolean {
   *  // after something happens to set it true
   *  return true;
   * }
   *
   * function delayedFn(name) {
   *  console.log(`Hello ${name}!`);
   * }
   *
   * const DelayedFn = WaitFor.create(resolveFn, delayedFn);
   *
   * DelayedFn('John') // "Hello John!" after resolver passes
   * ```
   */
  static create(resolveFn: Resolver, invokedFn: Function, options?:WaitForOptions) {
    const waiter = new this(resolveFn, invokedFn, options);
    return waiter.fire.bind(waiter);
  }

}

/**
 * Typescript method decorator that wraps the WaitFor class.
 *
 * ```ts
 * import { WaitFor } from 'waitfor.ts';
 *
 * let logit = false;
 *
 * function resolver() {
 *  setTimeout(() => logit = true, 500);
 * }
 *
 * class SomeCoolThing {
 *  @WaitFor(resolver);
 *  public imPatient(): string {
 *    console.log('It took about half a second, but i have arrived');
 *  }
 * }
 *
 * // in your implementation
 * new SomeCoolThing().imPatient(); // will log after 500ms
 * ```
 */
function decorator(resolverFn: (context: any) => boolean, options: WaitForOptions = {
  timeout: 1000
}) {

  return function <T extends Function>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>): PropertyDescriptor | void {
    return {
      configurable: true,
      get(this: T) {
        const bound = descriptor.value!.bind(this);
        const waiter = new WaitFor(resolverFn, bound, options);
        waiter.fire();
        return () => {};
      }
    };
  };
}

export default WaitFor;

export { decorator as WaitFor };
