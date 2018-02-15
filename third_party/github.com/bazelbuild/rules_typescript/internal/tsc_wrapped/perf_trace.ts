/**
 * @license
 * Copyright 2017 The Bazel Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * perf_trace records traces in the Chrome Trace format (which is actually used
 * for more than just Chrome).  See:
 * https://github.com/catapult-project/catapult/blob/master/tracing/README.md
 */

import * as fs from 'fs';

type Microseconds = number;

/** @return a high-res timestamp of the current time. */
function now(): Microseconds {
  const [sec, nsec] = process.hrtime();
  return (sec * 1e6) + (nsec / 1e3);
}

/**
 * The type of entries in the Chrome Trace format:
 * https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit
 * Field names are chosen to match the JSON format.
 */
declare interface Event {
  name: string;
  ph: 'B'|'E'|'X'|'C';
  pid: number;  // Required field in the trace viewer, but we don't use it.
  ts: Microseconds;
  dur?: Microseconds;
  args?: any;
}

let events: Event[] = [];

/** wrap wraps enter()/leave() calls around a block of code. */
export function wrap<T>(name: string, f: () => T): T {
  const start = now();
  try {
    return f();
  } finally {
    const end = now();
    events.push({name, ph: 'X', pid: 1, ts: start, dur: (end - start)});
  }
}

/**
 * counter records a snapshot of counts.  The counter name identifies a
 * single graph, while the counts object provides data for each count
 * of a line on the stacked bar graph.
 */
export function counter(name: string, counts: {[name: string]: number}) {
  events.push({name, ph: 'C', pid: 1, ts: now(), args: counts});
}

/**
 * reset deletes all recorded entries. It should be called before a logical
 * unit of work, e.g. before compiling one target.
 */
export function reset() {
  events = [];
}

/** write writes the trace in Chrome Trace format to a given path. */
export function write(path: string) {
  fs.writeFileSync(path, JSON.stringify(events), {encoding: 'utf8'});
  reset();
}

/**
 * Given an event name, return the total duration of all events of this name in
 * microseconds. If the event didn't happen then throw an error.
 */
export function getTotalDuration(name: string): number {
  const durations = events.filter(event => event.name === name && !!event.dur)
                        .map(event => event.dur as number);
  if (durations.length === 0) {
    throw new Error(`${name} event didn't happen.`);
  }

  return durations.reduce((dur1, dur2) => dur1 + dur2);
}
