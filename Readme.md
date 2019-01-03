# Waitfor.ts

A typescript utility to give a sequential feel to asyncronous/reactive programming patterns.

## Installation

```sh
$ npm install waitfor.ts
```

## What it does

You provide the class with a resolver function and another function that you wish to fire once resolved, the class will periodically attempt to resolve this function and, once resolved, will fire the intended function.
You supply your arguments to the Class's `fire` method, which are passed back to your entended function.

### Constructor Example

```typescript
import Waiter from 'waitfor.ts';
import EventDrivenClass from 'eventLib'; // 100% pseudo code

let ready = false;

function resolver() { ready = true; }

function notifier(user) {
  console.log(`Hey ${user}, the application is ready!`);
}

const Wait = new Waiter(resolver, notifier);

Wait.fire('Frank'); // will log out "Hey Frank, the application is ready!" after the listener event resets the `ready` variable to true.

const listener = new EventDrivenClass();

listener.on('ready', () => {
  ready = true;
});

```

### Static helper Example
There exists a static method that makes it feel a bit cleaner.
Here is the same example as above, but using the static helper.

```typescript
import Waiter from 'waitfor.ts';
import EventDrivenClass from 'eventLib'; // 100% pseudo code

let ready = false;

function resolver() { ready = true; }

function notifier(user) {
  console.log(`Hey ${user}, the application is ready!`);
}

const Greet = Waiter.create(resolver, notifier);

Greet('Frank'); // will log out "Hey Frank, the application is ready!" after the listener event resets the `ready` variable to true.

const listener = new EventDrivenClass();

listener.on('ready', () => {
  ready = true;
});

```

### Decorator Example
Also included is a decorator that can be used to allow you to wait for resolvers on your own class methods

```typescript
import { WaitFor } from 'waitfor.ts';

class Demo {

  private _user:string;

  constructor(){
    this.logUser();
  }

  @WaitFor(() => this.user !== undefined)
  private logUser(): void {
    console.log(`Hey ${this.user}, the application is ready!`);
  }

  public set user(user:string) {
    this._user = user;
  }

  public get user(): string {
    return this._user;
  }

}

// ...

const DecoratorDemo = new Demo(); // no log

DecoratorDemo.user = 'Frank';

// "Hey ${this.user}, the application is ready!"

```


## Available configuration options
| Option    |   Type  | Default | Description                                                                                     |
|-----------|:-------:|:-------:|-------------------------------------------------------------------------------------------------|
| timeout   |  number |   1000  | Number of milliseconds before the Class throws a timeout error.                                 |
| silent    | boolean |  false  | If true then the class wont throw an error at timeout, it will just stop attempting to resolve. |
| frequency |  number |    50   | Number of milliseconds between resolver attempts.          

