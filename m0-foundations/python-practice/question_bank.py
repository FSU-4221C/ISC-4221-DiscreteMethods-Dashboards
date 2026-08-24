"""The 100-snippet Python practice bank.

Every item is multiple choice and uses only standard Python 3 syntax.  The app
never evaluates learner-supplied code; these snippets are authored course data.
"""

from __future__ import annotations

from typing import Any


def Q(
    key: str,
    topic: str,
    difficulty: str,
    kind: str,
    prompt: str,
    code: str,
    options: tuple[str, str, str, str],
    correct: int,
    explanation: str,
    *,
    syntax_error_line: int | None = None,
) -> dict[str, Any]:
    """Build one JSON-safe question record."""

    item: dict[str, Any] = {
        "id": key,
        "topic": topic,
        "difficulty": difficulty,
        "kind": kind,
        "prompt": prompt,
        "code": code.strip("\n"),
        "options": list(options),
        "correct": correct,
        "explanation": explanation,
    }
    if syntax_error_line is not None:
        item["syntax_error_line"] = syntax_error_line
    return item


QUESTIONS = [
    # Core values and types · PY001–PY010
    Q("PY001", "Core values & types", "beginner", "predict_output", "What is printed?", """
x = 3
y = 2
print(x + y)
""", ("5", "6", "32", "TypeError"), 0, "Both names refer to integers, so + performs integer addition."),
    Q("PY002", "Core values & types", "beginner", "final_value", "What is the final value of x?", """
x = 7
x += 3
""", ("3", "7", "10", "73"), 2, "x += 3 is shorthand for x = x + 3."),
    Q("PY003", "Core values & types", "beginner", "predict_output", "What is printed?", """
value = 3.5
print(type(value).__name__)
""", ("int", "float", "number", "decimal"), 1, "A numeric literal with a decimal point creates a float."),
    Q("PY004", "Core values & types", "beginner", "trace_value", "What is printed?", """
x = 5
y = x
x = 8
print(y)
""", ("5", "8", "13", "NameError"), 0, "Rebinding x does not change the integer object already referenced by y."),
    Q("PY005", "Core values & types", "intermediate", "predict_output", "What is printed?", """
print(bool(0), bool("0"))
""", ("False False", "False True", "True False", "True True"), 1, "Numeric zero is falsey, while any nonempty string—including '0'—is truthy."),
    Q("PY006", "Core values & types", "beginner", "predict_output", "What is printed?", """
print(7 // 2, 7 / 2)
""", ("3 3", "3 3.5", "3.5 3", "4 3.5"), 1, "// performs floor division; / performs true division and returns a float."),
    Q("PY007", "Core values & types", "beginner", "find_error", "Which line contains the syntax error?", """
2value = 10
print(2value)
""", ("Line 1", "Line 2", "Both lines", "There is no error"), 0, "Identifiers cannot begin with a digit; both uses are invalid, and parsing stops first on line 1.", syntax_error_line=1),
    Q("PY008", "Core values & types", "beginner", "choose_fix", "Which replacement for line 2 prints 21?", """
age = "20"
print(age + 1)
""", ("print(age + '1')", "print(int(age) + 1)", "print(float + age)", "print(age.int() + 1)"), 1, "int(age) converts the digit string to an integer before addition."),
    Q("PY009", "Core values & types", "beginner", "trace_value", "What are a and b after line 3?", """
a = 1
b = 2
a, b = b, a
""", ("a=1, b=2", "a=2, b=1", "a=2, b=2", "a=1, b=1"), 1, "Tuple-style unpacking evaluates the right side first, so the values swap."),
    Q("PY010", "Core values & types", "beginner", "predict_output", "What is printed?", """
result = None
print(result is None)
""", ("True", "False", "None", "NameError"), 0, "is checks object identity; None is the singleton assigned to result."),

    # Strings · PY011–PY020
    Q("PY011", "Strings", "beginner", "predict_output", "What is printed?", """
word = "python"
print(word[0])
""", ("p", "y", "python", "IndexError"), 0, "Python sequences are zero-indexed, so index 0 is the first character."),
    Q("PY012", "Strings", "beginner", "predict_output", "What is printed?", """
word = "python"
print(word[-1])
""", ("p", "n", "o", "IndexError"), 1, "Index -1 selects the last character."),
    Q("PY013", "Strings", "beginner", "predict_output", "What is printed?", """
word = "python"
print(word[1:4])
""", ("pyt", "yth", "ytho", "tho"), 1, "A slice includes index 1 and stops before index 4."),
    Q("PY014", "Strings", "beginner", "predict_output", "What is printed?", """
language = "Python"
print(language.upper())
""", ("python", "PYTHON", "Python", "P"), 1, "str.upper returns a new uppercase string."),
    Q("PY015", "Strings", "beginner", "predict_output", "What is printed?", """
name = "Ada"
tasks = 3
print(f"{name}: {tasks}")
""", ("{name}: {tasks}", "Ada: tasks", "Ada: 3", "name: 3"), 2, "An f-string evaluates expressions inside braces."),
    Q("PY016", "Strings", "intermediate", "find_error", "Which line attempts an invalid operation?", """
name = "ada"
name[0] = "A"
print(name)
""", ("Line 1", "Line 2", "Line 3", "There is no error"), 1, "Strings are immutable, so an indexed character cannot be assigned."),
    Q("PY017", "Strings", "beginner", "predict_output", "What is printed?", """
parts = "red,green,blue".split(",")
print(len(parts))
""", ("2", "3", "14", "ValueError"), 1, "split creates three list elements around the two commas."),
    Q("PY018", "Strings", "beginner", "predict_output", "What is printed?", """
letters = ["a", "b", "c"]
print("-".join(letters))
""", ("abc", "a-b-c", "['a-b-c']", "a, b, c"), 1, "join inserts the separator between the strings."),
    Q("PY019", "Strings", "beginner", "predict_output", "What is printed?", """
text = "  data  "
print(text.strip())
""", ("  data", "data  ", "data", "d a t a"), 2, "strip removes whitespace from both ends, not from the middle."),
    Q("PY020", "Strings", "intermediate", "predict_output", "What is printed?", """
print("py" in "python")
""", ("True", "False", "0", "TypeError"), 0, "The in operator tests whether one string occurs inside another."),

    # Lists and tuples · PY021–PY030
    Q("PY021", "Lists & tuples", "beginner", "predict_output", "What is printed?", """
values = [1, 2]
values.append(3)
print(values)
""", ("[1, 2]", "[1, 2, 3]", "[1, 2, [3]]", "None"), 1, "append mutates the list by adding one element at the end."),
    Q("PY022", "Lists & tuples", "beginner", "predict_output", "What is printed?", """
values = [1, 2]
values.extend([3, 4])
print(values)
""", ("[1, 2, [3, 4]]", "[1, 2, 3, 4]", "[3, 4]", "None"), 1, "extend adds each element from the iterable to the list."),
    Q("PY023", "Lists & tuples", "intermediate", "trace_value", "What is printed?", """
a = [1, 2]
b = a
b.append(3)
print(a)
""", ("[1, 2]", "[1, 2, 3]", "[3]", "NameError"), 1, "a and b reference the same mutable list, so mutation through b is visible through a."),
    Q("PY024", "Lists & tuples", "intermediate", "trace_value", "What is printed?", """
a = [1, 2]
b = a.copy()
b.append(3)
print(a)
""", ("[1, 2]", "[1, 2, 3]", "[3]", "AttributeError"), 0, "copy creates a distinct list, so appending to b does not mutate a."),
    Q("PY025", "Lists & tuples", "beginner", "find_error", "Which line raises an exception when executed?", """
values = [10, 20, 30]
print(values[3])
""", ("Line 1", "Line 2", "Both lines", "Neither line"), 1, "The valid indices are 0, 1, and 2; index 3 raises IndexError."),
    Q("PY026", "Lists & tuples", "beginner", "predict_output", "What is printed?", """
point = (2, 3)
x, y = point
print(x + y)
""", ("5", "23", "(2, 3)", "ValueError"), 0, "Tuple unpacking assigns 2 to x and 3 to y."),
    Q("PY027", "Lists & tuples", "beginner", "find_error", "Which line attempts an invalid operation?", """
point = (2, 3)
point[0] = 5
""", ("Line 1", "Line 2", "Both lines", "Neither line"), 1, "Tuples are immutable, so indexed assignment is not allowed."),
    Q("PY028", "Lists & tuples", "beginner", "predict_output", "What is printed?", """
values = [1, 2, 3, 4]
print(values[1:3])
""", ("[1, 2]", "[2, 3]", "[2, 3, 4]", "[1, 2, 3]"), 1, "The slice includes positions 1 and 2 and stops before position 3."),
    Q("PY029", "Lists & tuples", "beginner", "predict_output", "What is printed?", """
values = [1, 2, 3]
values.remove(2)
print(values)
""", ("[1, 2]", "[1, 3]", "[2, 3]", "[1, 2, 3]"), 1, "remove deletes the first element equal to the supplied value."),
    Q("PY030", "Lists & tuples", "intermediate", "predict_output", "What is printed?", """
values = [3, 1, 2]
result = values.sort()
print(result)
""", ("[1, 2, 3]", "[3, 1, 2]", "None", "TypeError"), 2, "list.sort mutates the list in place and returns None."),

    # Dictionaries and sets · PY031–PY040
    Q("PY031", "Dictionaries & sets", "beginner", "predict_output", "What is printed?", """
scores = {"Ada": 9, "Lin": 8}
print(scores["Ada"])
""", ("Ada", "8", "9", "KeyError"), 2, "Dictionary subscription looks up the value stored under the key 'Ada'."),
    Q("PY032", "Dictionaries & sets", "beginner", "predict_output", "What is printed?", """
counts = {"red": 2}
print(counts.get("blue", 0))
""", ("None", "0", "2", "KeyError"), 1, "get returns the provided default when the key is absent."),
    Q("PY033", "Dictionaries & sets", "beginner", "trace_value", "What is counts['x'] after line 2?", """
counts = {"x": 2}
counts["x"] += 1
""", ("1", "2", "3", "'x1'"), 2, "+= reads the old value 2, adds 1, and stores 3 back under the same key."),
    Q("PY034", "Dictionaries & sets", "beginner", "predict_output", "What is printed?", """
values = {1, 1, 2, 3, 3}
print(len(values))
""", ("3", "5", "2", "TypeError"), 0, "A set stores unique values, leaving {1, 2, 3}."),
    Q("PY035", "Dictionaries & sets", "intermediate", "explain_code", "Which values are in common?", """
a = {1, 2, 3}
b = {2, 3, 4}
common = a & b
""", ("{1, 4}", "{2, 3}", "{1, 2, 3, 4}", "{}"), 1, "The & operator computes set intersection."),
    Q("PY036", "Dictionaries & sets", "beginner", "find_error", "Which line raises an exception when executed?", """
scores = {"Ada": 9}
print(scores["Lin"])
""", ("Line 1", "Line 2", "Both lines", "Neither line"), 1, "Subscription with an absent key raises KeyError; get could provide a default."),
    Q("PY037", "Dictionaries & sets", "intermediate", "predict_output", "What is printed?", """
data = {"b": 2, "a": 1}
print(sorted(data))
""", ("['a', 'b']", "[1, 2]", "[('a', 1), ('b', 2)]", "TypeError"), 0, "Iterating over a dictionary yields keys; sorted orders those keys."),
    Q("PY038", "Dictionaries & sets", "beginner", "predict_output", "What is printed?", """
data = {"x": 10}
print("x" in data, 10 in data)
""", ("True True", "True False", "False True", "False False"), 1, "Dictionary membership tests keys, not values."),
    Q("PY039", "Dictionaries & sets", "beginner", "predict_output", "What is printed?", """
items = {1, 2}
items.add(2)
print(len(items))
""", ("1", "2", "3", "ValueError"), 1, "Adding a value already in a set leaves the set unchanged."),
    Q("PY040", "Dictionaries & sets", "intermediate", "choose_fix", "Which key can replace [1, 2] without raising TypeError?", """
lookup = {}
lookup[[1, 2]] = "point"
""", ("{1, 2}", "(1, 2)", "[2, 1]", "set([1, 2])"), 1, "Dictionary keys must be hashable; a tuple of integers is hashable, while lists and sets are mutable."),

    # Conditionals · PY041–PY050
    Q("PY041", "Conditionals", "beginner", "predict_output", "What is printed?", """
x = 4
if x > 0:
    print("positive")
else:
    print("not positive")
""", ("positive", "not positive", "4", "Nothing"), 0, "The condition 4 > 0 is true, so the first branch runs."),
    Q("PY042", "Conditionals", "intermediate", "predict_output", "What is printed?", """
score = 85
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
else:
    print("C")
""", ("A", "B", "C", "A then B"), 1, "The first condition is false and the elif condition is true; only that branch runs."),
    Q("PY043", "Conditionals", "beginner", "predict_output", "What is printed?", """
x = 5
print(1 < x < 10)
""", ("True", "False", "5", "SyntaxError"), 0, "Python supports chained comparisons; both 1 < 5 and 5 < 10 are true."),
    Q("PY044", "Conditionals", "intermediate", "predict_output", "What is printed?", """
x = 0
print(x != 0 and 10 / x > 1)
""", ("True", "False", "ZeroDivisionError", "None"), 1, "and short-circuits after x != 0 is false, so 10 / x is never evaluated."),
    Q("PY045", "Conditionals", "beginner", "find_error", "Which line contains the syntax error?", """
if temperature > 30:
print("hot")
""", ("Line 1", "Line 2", "Both lines", "There is no error"), 1, "The body of an if statement must be indented.", syntax_error_line=2),
    Q("PY046", "Conditionals", "beginner", "choose_fix", "Which token should replace = on line 1?", """
if score = 10:
    print("perfect")
""", ("==", ":=", "!=", "=>"), 0, "== compares values; = is assignment and is not valid in this condition.", syntax_error_line=1),
    Q("PY047", "Conditionals", "beginner", "predict_output", "What is printed?", """
n = 6
label = "even" if n % 2 == 0 else "odd"
print(label)
""", ("even", "odd", "True", "6"), 0, "The conditional expression chooses 'even' because the remainder is zero."),
    Q("PY048", "Conditionals", "beginner", "predict_output", "What is printed?", """
print(not [])
""", ("True", "False", "[]", "TypeError"), 0, "An empty list is falsey, so not reverses it to True."),
    Q("PY049", "Conditionals", "intermediate", "predict_output", "What is printed?", """
if 3:
    print("yes")
else:
    print("no")
""", ("yes", "no", "3", "TypeError"), 0, "Any nonzero integer is truthy in a condition."),
    Q("PY050", "Conditionals", "intermediate", "predict_output", "What is printed?", """
x = 5
if x > 0:
    if x % 2:
        print("odd")
    else:
        print("even")
""", ("odd", "even", "positive", "Nothing"), 0, "5 % 2 is 1, which is truthy, so the nested odd branch runs."),

    # Loops · PY051–PY060
    Q("PY051", "Loops", "beginner", "predict_output", "What is printed?", """
for i in range(3):
    print(i, end=" ")
""", ("0 1 2", "1 2 3", "0 1 2 3", "3"), 0, "range(3) generates 0, 1, and 2; the stop value is excluded."),
    Q("PY052", "Loops", "beginner", "trace_value", "What is printed?", """
total = 0
for n in [1, 2, 3]:
    total += n
print(total)
""", ("3", "5", "6", "123"), 2, "The accumulator becomes 1, then 3, then 6."),
    Q("PY053", "Loops", "intermediate", "predict_output", "What is the first line printed?", """
for index, letter in enumerate("ab", start=1):
    print(index, letter)
""", ("0 a", "1 a", "1 b", "a 1"), 1, "start=1 makes the first index 1 while the first character is 'a'."),
    Q("PY054", "Loops", "intermediate", "predict_output", "What is printed?", """
for n in range(5):
    if n == 3:
        break
    print(n, end=" ")
""", ("0 1 2", "0 1 2 3", "1 2 3", "3 4"), 0, "break exits before 3 is printed."),
    Q("PY055", "Loops", "intermediate", "predict_output", "What is printed?", """
for n in range(5):
    if n % 2 == 1:
        continue
    print(n, end=" ")
""", ("0 1 2 3 4", "1 3", "0 2 4", "2 4"), 2, "continue skips the print for odd values."),
    Q("PY056", "Loops", "beginner", "predict_output", "What is printed?", """
count = 0
while count < 3:
    count += 1
print(count)
""", ("0", "2", "3", "The loop never ends"), 2, "The loop increments count until the condition count < 3 becomes false."),
    Q("PY057", "Loops", "beginner", "predict_output", "What is printed?", """
print(list(range(1, 4)))
""", ("[0, 1, 2, 3]", "[1, 2, 3]", "[1, 2, 3, 4]", "[1, 4]"), 1, "range includes the start value and excludes the stop value."),
    Q("PY058", "Loops", "beginner", "find_error", "Which line contains the syntax error?", """
for item in items
    print(item)
""", ("Line 1", "Line 2", "Both lines", "There is no error"), 0, "A for statement must end its header with a colon.", syntax_error_line=1),
    Q("PY059", "Loops", "intermediate", "predict_output", "What is printed?", """
for n in [1, 2, 3]:
    if n == 5:
        break
else:
    print("done")
""", ("done", "5", "Nothing", "SyntaxError"), 0, "A loop's else block runs when the loop finishes without break."),
    Q("PY060", "Loops", "intermediate", "trace_value", "What is printed?", """
count = 0
for row in range(2):
    for column in range(3):
        count += 1
print(count)
""", ("2", "3", "5", "6"), 3, "The inner body runs 2 × 3 = 6 times."),

    # Functions · PY061–PY070
    Q("PY061", "Functions", "beginner", "predict_output", "What is printed?", """
def add(a, b):
    return a + b

print(add(2, 3))
""", ("5", "23", "None", "TypeError"), 0, "The arguments bind to a and b, and return sends their sum to print."),
    Q("PY062", "Functions", "beginner", "predict_output", "What is printed?", """
def scale(value, factor=2):
    return value * factor

print(scale(3))
""", ("2", "3", "5", "6"), 3, "The omitted factor uses its default value 2."),
    Q("PY063", "Functions", "intermediate", "find_error", "Which line contains the syntax error?", """
def combine(a, b):
    return a + b
print(combine(a=1, 2))
""", ("Line 1", "Line 2", "Line 3", "There is no error"), 2, "A positional argument cannot follow a keyword argument in a call.", syntax_error_line=3),
    Q("PY064", "Functions", "beginner", "predict_output", "What is printed?", """
def answer():
    return 4
    print("later")

print(answer())
""", ("later then 4", "4 then later", "4", "Nothing"), 2, "return exits the function immediately, so the later print is unreachable."),
    Q("PY065", "Functions", "intermediate", "find_error", "Which line raises NameError?", """
def build():
    secret = 7
    return secret
print(secret)
""", ("Line 1", "Line 2", "Line 3", "Line 4"), 3, "secret is local to build and does not exist in the global scope."),
    Q("PY066", "Functions", "intermediate", "trace_value", "What is printed?", """
def add_item(items):
    items.append("x")

values = []
add_item(values)
print(values)
""", ("[]", "['x']", "None", "NameError"), 1, "The parameter refers to the same mutable list, so append changes values."),
    Q("PY067", "Functions", "intermediate", "choose_fix", "Which function header avoids sharing one mutable default list?", """
def collect(item, items=[]):
    items.append(item)
    return items
""", ("def collect(item, items={}):", "def collect(item, items=None):", "def collect(item, items=list):", "def collect(items, item=[]):"), 1, "Use None as the sentinel, then create a new list inside the function when needed."),
    Q("PY068", "Functions", "intermediate", "predict_output", "What is printed?", """
def total(*numbers):
    return sum(numbers)

print(total(1, 2, 3))
""", ("3", "6", "(1, 2, 3)", "TypeError"), 1, "*numbers collects positional arguments into a tuple consumed by sum."),
    Q("PY069", "Functions", "intermediate", "predict_output", "What is printed?", """
square = lambda x: x * x
print(square(4))
""", ("4", "8", "16", "lambda"), 2, "The lambda returns x multiplied by itself."),
    Q("PY070", "Functions", "intermediate", "trace_value", "What is printed?", """
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)

print(factorial(4))
""", ("4", "10", "16", "24"), 3, "The recursive calls compute 4 × 3 × 2 × 1."),

    # Comprehensions and generators · PY071–PY080
    Q("PY071", "Comprehensions", "beginner", "predict_output", "What is printed?", """
squares = [x * x for x in range(4)]
print(squares)
""", ("[0, 1, 4, 9]", "[1, 4, 9, 16]", "[0, 1, 2, 3]", "16"), 0, "The expression x*x runs once for each value 0 through 3."),
    Q("PY072", "Comprehensions", "beginner", "predict_output", "What is printed?", """
evens = [x for x in range(5) if x % 2 == 0]
print(evens)
""", ("[1, 3]", "[0, 2, 4]", "[2, 4]", "[0, 1, 2, 3, 4]"), 1, "The trailing if keeps only values with remainder zero."),
    Q("PY073", "Comprehensions", "intermediate", "predict_output", "What is printed?", """
table = {x: x * x for x in range(3)}
print(table)
""", ("{0: 0, 1: 1, 2: 4}", "[0, 1, 4]", "{0, 1, 4}", "{1: 1, 2: 4, 3: 9}"), 0, "The dictionary comprehension maps each x to its square in insertion order."),
    Q("PY074", "Comprehensions", "intermediate", "trace_value", "What is printed?", """
unique = {x for x in [1, 1, 2, 3, 3]}
print(len(unique))
""", ("2", "3", "5", "TypeError"), 1, "A set comprehension removes duplicate results."),
    Q("PY075", "Comprehensions", "intermediate", "predict_output", "What is printed?", """
rows = [[1, 2], [3, 4]]
flat = [value for row in rows for value in row]
print(flat)
""", ("[[1, 2], [3, 4]]", "[1, 2, 3, 4]", "[1, 3, 2, 4]", "[3, 7]"), 1, "The comprehension visits each row, then each value within that row."),
    Q("PY076", "Comprehensions", "beginner", "find_error", "Which line contains the syntax error?", """
values = [x for x range(3)]
print(values)
""", ("Line 1", "Line 2", "Both lines", "There is no error"), 0, "A comprehension requires in between its target and iterable.", syntax_error_line=1),
    Q("PY077", "Comprehensions", "intermediate", "predict_output", "What is printed?", """
labels = ["even" if x % 2 == 0 else "odd" for x in range(3)]
print(labels)
""", ("['even', 'odd', 'even']", "['odd', 'even', 'odd']", "[True, False, True]", "['even']"), 0, "The conditional expression labels 0 and 2 even and 1 odd."),
    Q("PY078", "Comprehensions", "intermediate", "predict_output", "What is printed?", """
values = (x * x for x in range(3))
print(next(values), next(values))
""", ("0 1", "1 4", "0 4", "[0, 1]"), 0, "A generator yields lazily: the first two squares are 0 and 1."),
    Q("PY079", "Comprehensions", "beginner", "explain_code", "Which loop is equivalent?", """
doubled = [2 * x for x in values]
""", ("for x in values: doubled = 2 * x", "doubled = []\nfor x in values:\n    doubled.append(2 * x)", "doubled = values.append(2)", "for doubled in values: x = 2"), 1, "A list comprehension builds a new list by appending one transformed value per iteration."),
    Q("PY080", "Comprehensions", "intermediate", "find_error", "Which line raises NameError in Python 3?", """
squares = [x * x for x in range(3)]
print(x)
""", ("Line 1", "Line 2", "Both lines", "Neither line"), 1, "The comprehension variable has its own scope and is not defined afterward."),

    # Errors and exceptions · PY081–PY090
    Q("PY081", "Errors & exceptions", "beginner", "find_error", "Which line raises ZeroDivisionError?", """
total = 10
average = total / 0
print(average)
""", ("Line 1", "Line 2", "Line 3", "No line"), 1, "Division by numeric zero fails while evaluating line 2."),
    Q("PY082", "Errors & exceptions", "beginner", "predict_output", "What is printed?", """
try:
    value = int("abc")
except ValueError:
    print("handled")
""", ("abc", "0", "handled", "ValueError terminates the program"), 2, "int('abc') raises ValueError, which the matching except block catches."),
    Q("PY083", "Errors & exceptions", "intermediate", "choose_fix", "Which handler order preserves the specific case?", """
try:
    risky()
except Exception:
    print("general")
except ValueError:
    print("bad value")
""", ("Keep the current order", "Put except ValueError before except Exception", "Remove try", "Replace both with finally"), 1, "Exception catches ValueError too, so the more specific handler must come first."),
    Q("PY084", "Errors & exceptions", "intermediate", "predict_output", "What is printed?", """
try:
    n = -1
    if n < 0:
        raise ValueError("negative")
except ValueError:
    print("invalid")
""", ("negative", "invalid", "-1", "Nothing"), 1, "raise transfers control to the matching ValueError handler."),
    Q("PY085", "Errors & exceptions", "intermediate", "predict_output", "What is printed?", """
try:
    result = 8 / 2
except ZeroDivisionError:
    print("error")
else:
    print(result)
""", ("error", "4.0", "4", "Nothing"), 1, "No exception occurs, so the else block prints the floating-point result."),
    Q("PY086", "Errors & exceptions", "intermediate", "predict_output", "What is printed, in order?", """
try:
    print("try")
finally:
    print("finally")
""", ("try", "finally", "try then finally", "finally then try"), 2, "The try body runs, and finally runs afterward regardless of exceptions."),
    Q("PY087", "Errors & exceptions", "beginner", "explain_code", "Which exception does line 1 raise?", """
number = int("3.5")
""", ("TypeError", "ValueError", "IndexError", "No exception"), 1, "The string is not a valid base-10 integer literal; int raises ValueError."),
    Q("PY088", "Errors & exceptions", "beginner", "explain_code", "Which exception does line 2 raise?", """
items = [10]
print(items[2])
""", ("KeyError", "IndexError", "NameError", "ValueError"), 1, "The requested list position is outside the valid index range."),
    Q("PY089", "Errors & exceptions", "beginner", "explain_code", "What happens?", """
assert 2 + 2 == 5
""", ("It returns False", "It prints 5", "It raises AssertionError", "It raises SyntaxError"), 2, "assert raises AssertionError when its condition is false."),
    Q("PY090", "Errors & exceptions", "beginner", "choose_fix", "Which except header correctly captures the exception object?", """
try:
    value = int(text)
except ???:
    print(exc)
""", ("ValueError as exc", "ValueError is exc", "ValueError(exc)", "exc from ValueError"), 0, "The syntax is except ExceptionType as name:.", syntax_error_line=3),

    # Classes and modules · PY091–PY100
    Q("PY091", "Classes & modules", "beginner", "predict_output", "What is printed?", """
class Student:
    def __init__(self, name):
        self.name = name

student = Student("Ada")
print(student.name)
""", ("Student", "name", "Ada", "None"), 2, "__init__ stores the argument on the new instance as self.name."),
    Q("PY092", "Classes & modules", "intermediate", "find_error", "Which line in the class must be fixed so the method call works?", """
class Greeter:
    def greet():
        return "hello"

print(Greeter().greet())
""", ("Line 1", "Line 2", "Line 3", "Line 5"), 1, "An instance method must accept self as its first parameter; the failure appears at the call but the defect is line 2."),
    Q("PY093", "Classes & modules", "intermediate", "predict_output", "What is printed?", """
class Counter:
    total = 0

a = Counter()
b = Counter()
a.total = 3
print(b.total)
""", ("0", "3", "None", "AttributeError"), 0, "Assigning a.total creates an instance attribute on a; b still reads the class attribute 0."),
    Q("PY094", "Classes & modules", "beginner", "predict_output", "What is printed?", """
class Rectangle:
    def area(self, width, height):
        return width * height

print(Rectangle().area(3, 4))
""", ("7", "12", "34", "TypeError"), 1, "The bound method receives the instance as self and multiplies the two explicit arguments."),
    Q("PY095", "Classes & modules", "intermediate", "predict_output", "What is printed?", """
class Point:
    def __str__(self):
        return "point!"

print(Point())
""", ("Point", "point!", "<Point>", "None"), 1, "print uses the object's __str__ result."),
    Q("PY096", "Classes & modules", "intermediate", "predict_output", "What is printed?", """
class Animal:
    def speak(self):
        return "sound"

class Dog(Animal):
    pass

print(Dog().speak())
""", ("sound", "Dog", "None", "AttributeError"), 0, "Dog inherits speak from Animal."),
    Q("PY097", "Classes & modules", "intermediate", "trace_value", "What is printed?", """
class Course:
    def __init__(self):
        self.students = []

course = Course()
course.students.append("Ada")
print(len(course.students))
""", ("0", "1", "3", "AttributeError"), 1, "The Course instance contains a list, and one name is appended to it."),
    Q("PY098", "Classes & modules", "beginner", "predict_output", "What is printed?", """
import math
print(math.sqrt(9))
""", ("3", "3.0", "9", "NameError"), 1, "math.sqrt returns a floating-point square root."),
    Q("PY099", "Classes & modules", "beginner", "predict_output", "What is printed?", """
from math import pi
print(round(pi, 2))
""", ("3", "3.14", "3.142", "pi"), 1, "round(pi, 2) rounds the imported constant to two decimal places."),
    Q("PY100", "Classes & modules", "intermediate", "explain_code", "What is the purpose of the condition?", """
def main():
    print("run")

if __name__ == "__main__":
    main()
""", ("Run main only when this file is executed directly", "Run main only when this file is imported", "Rename the module to main", "Prevent functions from being defined"), 0, "A module receives __name__ == '__main__' when executed directly, but not when imported."),
]


QUESTION_BY_ID = {question["id"]: question for question in QUESTIONS}
TOPICS = tuple(dict.fromkeys(question["topic"] for question in QUESTIONS))
KINDS = tuple(dict.fromkeys(question["kind"] for question in QUESTIONS))

KIND_LABELS = {
    "predict_output": "Predict output",
    "final_value": "Trace final value",
    "trace_value": "Trace program state",
    "explain_code": "Explain behavior",
    "find_error": "Locate the error",
    "choose_fix": "Choose a fix",
}
