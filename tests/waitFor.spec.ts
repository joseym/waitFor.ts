import 'source-map-support/register'
import {default as waitForClass, WaitFor} from './../src';
import { mock, spy, SinonSpy, stub, createStubInstance, useFakeTimers, SinonFakeTimers } from 'sinon';
import { expect, assert } from 'chai';

let clock:SinonFakeTimers;
describe('waitFor', function () {

  before(() => {
    clock = useFakeTimers(new Date());
  });

  after(() => {
    clock.restore();
  })

  describe('When invoked from the class', () => {

    it('Fires the requested function when resolved to true.', () => {
      const resolverFn = () => true;
      const delayedFn = spy(() => 'Invoked');
      const Wait = new waitForClass(resolverFn, delayedFn);

      Wait.fire();

      expect(delayedFn.calledOnce).true;
    });

    it(`Throws an error if it doesn't resolve before the timeout.`, async () => {
      
      let error;

      const resolverFn = () => false;
      const delayedFn = () => {};
      const Wait = new waitForClass(resolverFn, delayedFn, { timeout: 1000 });

      try {
        Wait.fire();
        clock.tick(1000);
        await Promise.resolve();
      } catch (e) {
        error = e;
      } finally {
        expect(error).not.undefined;
        expect(error.message).eq('waitFor timeout');
      }

    });

    it(`Fire method hands off arguments to the invoked function`, () => {
      const resolverFn = () => true;
      const invokedFn = spy((a:number, b:number, c:number) => [a,b,c]);
      const Waiter = new waitForClass(resolverFn, invokedFn);
      Waiter.fire(1,2,3);
      expect(invokedFn.called).true;
      expect(invokedFn.returned([1,2,3])).true;
    })

    it(`Doesn't throw an error if the silent option is passed in.`, async () => {
      let error;

      const resolverFn = () => false;
      const delayedFn = () => {};
      const Wait = new waitForClass(resolverFn, delayedFn, { timeout: 1000, silent: true });

      try {
        Wait.fire();
        clock.tick(1000);
        await Promise.resolve();
      } catch (e) {
        error = e;
      } finally {
        expect(error).is.undefined;
      }

    })

    it(`Passes if it resolves before timeout.`, async () => {

      let resolve = false;

      const timeout = 1000;
      const delay = 100; // how long before it resolves
      const frequency = 50; // ms between attempts
      // number of times the resolver will be called before resolving true. +1 because it will call on final time.
      const maxCalls = (delay/frequency) + 1 

      setTimeout(() => {
        resolve = true;
      }, delay)

      const resolverFn = spy(() => resolve);
      const delayedFn = spy(() => 'Invoked');

      const Wait = new waitForClass(resolverFn, delayedFn, { timeout, frequency });

      Wait.fire();
      expect(delayedFn.called).false;
      clock.tick(1000);
      expect(resolverFn.callCount).to.eq(maxCalls);
      expect(delayedFn.calledOnce).true;
      expect(delayedFn.returned('Invoked'))

    });

    it(`Has a static helper method to make usage feel cleaner`, () => {
      let passed = false;
      const resolverFn = () => passed;
      const delayedFn = spy((name:string) => `Hello ${name}!`);
      const Wait = waitForClass.create(resolverFn, delayedFn);
      Wait('John');
      expect(delayedFn.called).false
      setTimeout(() => { passed = true }, 500)
      clock.tick(1000);
      expect(delayedFn.calledOnce).true;
      expect(delayedFn.returned('Hello John!'))
    })

  });

  describe('When used as a method decorator', () => {

    function decorateMethod(resolver: () => boolean | boolean, options = { timeout: 2000 }): [SinonSpy<any[], any>, any] {
      const returnSpy = spy(() => 'I have returned!');
      class decorated {
        @WaitFor(resolver, options)
        public delayed(): string {
          return returnSpy();
        }
        @WaitFor(resolver)
        public withNoOptions(): string {
          return returnSpy()
        }

      }
      return [returnSpy, new decorated()];
    }

    it(`shouldn't fire the method until the resolver passes`, () => {
      let passed = false;
      setTimeout(() => { passed = true; }, 1000);
      const resolver = () => passed;
      const [spied, waitClass] = decorateMethod(resolver);
      waitClass.delayed();
      waitClass.withNoOptions();
      expect(spied.called).false
      clock.tick(2000);
      expect(spied.calledTwice).true;
      expect(spied.returnValues[0]).to.equal('I have returned!');
    });


  })

});