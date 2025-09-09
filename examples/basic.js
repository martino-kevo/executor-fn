import Executor from "../executor.js"

// 🔹 Example 1: Basic usage
const add = Executor((a, b) => a + b)
console.log("Add result:", add(10, 5)) // ➡ 15

// 🔹 Example 2: Stateful usage with history
const calc = Executor((a, b) => a + b, {
    storeHistory: true,
    callNow: true,
    initialArgs: [2, 3]
})

console.log("Initial value:", calc.value) // ➡ 5

calc(10, 5) // ➡ 15
calc(50, 1) // ➡ 51

console.log("History:", calc.history) // ➡ [5, 15, 51]

calc.undo()
console.log("After undo:", calc.value) // ➡ 15

calc.redo()
console.log("After redo:", calc.value) // ➡ 51

calc.reset()
console.log("After reset:", calc.value) // ➡ 5

// 3️⃣ Default Arguments Support
const greet = Executor((name = "Guest") => `Hello, ${name}!`, {
    callNow: true
})

console.log(greet.value) // "Hello, Guest!"
console.log(greet("Ada")) // "Hello, Ada!"

// 4️⃣ Logging Current Value
greet.log() // Logs: "Hello, Guest!"

// 5️⃣ Straight Calling
Executor(() => console.log("Straight call executed!"), { callNow: true })


/*
Take caution 😬 if you're doing:

const myGreet = greet("Ada")
myGreet.log() OR console.log(myGreet) 

👉 Test code properly

Also myGreet.value OR myGreet.[anything] would return undefined.

Just call greet("Kelvin") and...
greet.value = Updated value (in this case Kelvin) ✅

And greet.[anything] Would work 😎

See advanced.js and advanced2.js and other examples 
and you will start bending functions to your will 
in no time.

Also, Don't be scared. Executor, a function wrapper which does state management 
and time manipulation / time travel is super easy to learn.
*/