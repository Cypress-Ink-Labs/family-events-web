import { describe, expect, it } from "vitest"

import { mapWithConcurrency } from "./map-with-concurrency"

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

describe("mapWithConcurrency", () => {
  it("preserves input order when tasks complete out of order", async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const third = deferred<string>()
    const tasks = [first, second, third]

    const resultPromise = mapWithConcurrency(tasks, 3, (task) => task.promise)

    third.resolve("third")
    second.resolve("second")
    first.resolve("first")

    await expect(resultPromise).resolves.toEqual([
      { status: "fulfilled", value: "first" },
      { status: "fulfilled", value: "second" },
      { status: "fulfilled", value: "third" },
    ])
  })

  it("settles every item when callbacks both fulfill and reject", async () => {
    const result = await mapWithConcurrency([1, 2, 3], 2, async (item) => {
      if (item === 2) {
        throw new Error("failed")
      }

      return item * 2
    })

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ status: "fulfilled", value: 2 })
    expect(result[1]).toMatchObject({ status: "rejected" })
    expect(result[2]).toEqual({ status: "fulfilled", value: 6 })
  })

  it("runs no more than four deferred callbacks at once", async () => {
    const tasks = Array.from({ length: 10 }, deferred<number>)
    let inFlight = 0
    let maxInFlight = 0

    const resultPromise = mapWithConcurrency(tasks, 4, async (task) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      try {
        return await task.promise
      } finally {
        inFlight -= 1
      }
    })

    expect(maxInFlight).toBe(4)

    for (const task of tasks) {
      task.resolve(1)
      await Promise.resolve()
    }

    await expect(resultPromise).resolves.toHaveLength(10)
    expect(maxInFlight).toBe(4)
  })
})
