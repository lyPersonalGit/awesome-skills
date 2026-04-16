# 重构说明 搬移特性与重新组织数据

本章介绍了**在不同上下文之间搬移程序元素**和**重新组织数据结构**两组更高级的重构手法，帮助你调整代码结构，让程序设计更贴合对问题的理解。

---

## 目录
### 搬移特性
1. [搬移函数](#81-搬移函数move-function)
2. [搬移字段](#82-搬移字段move-field)
3. [搬移语句到函数](#83-搬移语句到函数move-statements-into-function)
4. [搬移语句到调用者](#84-搬移语句到调用者move-statements-to-callers)
5. [以函数调用取代内联代码](#85-以函数调用取代内联代码replace-inline-code-with-function-call)
6. [移动语句](#86-移动语句slide-statements)
7. [拆分循环](#87-拆分循环split-loop)
8. [以管道取代循环](#88-以管道取代循环replace-loop-with-pipeline)
9. [移除死代码](#89-移除死代码remove-dead-code)

### 重新组织数据
10. [拆分变量](#91-拆分变量split-variable)
11. [字段改名](#92-字段改名rename-field)
12. [以查询取代派生变量](#93-以查询取代派生变量replace-derived-variable-with-query)
13. [将引用对象改为值对象](#94-将引用对象改为值对象change-reference-to-value)
14. [将值对象改为引用对象](#95-将值对象改为引用对象change-value-to-reference)

---

## 搬移特性

## 8.1 搬移函数（Move Function）

**曾用名**：搬移函数（Move Method）

### 核心思想
如果一个函数频繁引用另一个上下文中的元素，比在自身上下文用得还多，就把它搬去那个上下文。

### 动机
- 好的模块化需要让相关元素集中在一起，减少不必要的依赖
- 随着理解加深，不断调整函数位置，让代码结构更合理
- 帮助函数找到最合适的家

### 做法
1. 检查函数在当前上下文引用的所有元素，考虑是否需要一并搬移
2. 先搬移依赖最少的函数
3. 将函数复制到目标上下文，调整适配新环境
4. 在源上下文修改为委托调用
5. 测试，考虑是否将源函数内联移除

### 示例
```javascript
// 搬移前
class Account {
  get overdraftCharge() {
    if (this.type.isPremium) {
      const baseCharge = 10;
      if (this.daysOverdrawn <= 7)
        return baseCharge;
      else
        return baseCharge + (this.daysOverdrawn - 7) * 0.85;
    }
    else
      return this.daysOverdrawn * 1.75;
  }
}

// 搬移后
class AccountType {
  overdraftCharge(daysOverdrawn) {
    if (this.isPremium) {
      const baseCharge = 10;
      if (daysOverdrawn <= 7)
        return baseCharge;
      else
        return baseCharge + (daysOverdrawn - 7) * 0.85;
    }
    else
      return daysOverdrawn * 1.75;
  }
}

class Account {
  get overdraftCharge() {
    return this.type.overdraftCharge(this.daysOverdrawn);
  }
}
```

---

## 8.2 搬移字段（Move Field）

### 核心思想
如果一个字段更应该在另一个对象中，就把它搬移过去。

### 动机
- 良好的数据结构是程序健壮的根基
- 发现字段放错位置就及时调整，避免代码越来越复杂
- 如果总是一起传递的参数，它们应该放在一起

### 做法
1. 确保源字段已经封装
2. 在目标对象创建同名字段和访问函数
3. 确保源对象能引用到目标对象
4. 修改源对象的访问函数，让它使用目标对象的字段
5. 测试，移除源对象的原字段

### 示例
```javascript
// 搬移前
class Customer {
  get discountRate() {return this._discountRate;}
}

// 搬移后
class Customer {
  get discountRate() {return this.contract.discountRate;}
}
```

---

## 8.3 搬移语句到函数（Move Statements into Function）

**反向重构**：搬移语句到调用者（217）

### 核心思想
调用函数前总有几句重复代码，把它们合并到函数里。

### 动机
- 消除重复，一处修改到处生效
- 让代码更集中，逻辑更内聚

### 做法
1. 如果多个调用点都有重复代码在调用前，先提炼这部分和目标函数到新函数
2. 逐一替换所有调用点
3. 内联原目标函数到新函数，改名完成

### 示例
```javascript
// 搬移前
result.push(`<p>title: ${person.photo.title}</p>`);
result.concat(photoData(person.photo));

function photoData(aPhoto) {
  return [
    `<p>location: ${aPhoto.location}</p>`,
    `<p>date: ${aPhoto.date.toDateString()}</p>`,
  ];
}

// 搬移后
result.concat(photoData(person.photo));

function photoData(aPhoto) {
  return [
    `<p>title: ${aPhoto.title}</p>`,
    `<p>location: ${aPhoto.location}</p>`,
    `<p>date: ${aPhoto.date.toDateString()}</p>`,
  ];
}
```

---

## 8.4 搬移语句到调用者（Move Statements to Callers）

**反向重构**：搬移语句到函数（213）

### 核心思想
函数原来统一包含的行为，现在不同调用点需要不同行为，把差异代码搬移到调用者。

### 动机
- 抽象边界偏移后，调整边界适应新需求
- 让不同调用点可以有不同行为，不必修改原函数

### 做法
1. 将不需要搬移的代码提炼成新函数
2. 内联原函数到所有调用点
3. 将新函数改回原函数名

### 示例
```javascript
// 搬移前
emitPhotoData(outStream, person.photo);

function emitPhotoData(outStream, photo) {
  outStream.write(`<p>title: ${photo.title}</p>\n`);
  outStream.write(`<p>location: ${photo.location}</p>\n`);
}

// 搬移后
emitPhotoData(outStream, person.photo);
outStream.write(`<p>location: ${person.photo.location}</p>\n`);

function emitPhotoData(outStream, photo) {
  outStream.write(`<p>title: ${photo.title}</p>\n`);
}
```

---

## 8.5 以函数调用取代内联代码（Replace Inline Code with Function Call）

### 核心思想
如果已有函数做了内联代码的工作，直接调用函数即可。

### 动机
- 消除重复，利用现有函数
- 函数名本身就是注释，更易读
- 修改函数实现时，所有调用点自动受益

### 做法
直接替换，测试搞定。

### 示例
```javascript
// 替换前
let appliesToMass = false;
for (const s of states) {
  if (s === "MA") appliesToMass = true;
}

// 替换后
appliesToMass = states.includes("MA");
```

---

## 8.6 移动语句（Slide Statements）

### 核心思想
让相关的代码放在一起。

### 动机
- 相关代码在一起更容易理解
- 提炼函数之前通常需要先移动代码集中相关部分

### 做法
1. 确定移动目的地，检查不会影响现有逻辑
2. 剪切粘贴，测试
3. 如果测试失败，减小移动步子

### 示例
```javascript
// 移动前
const pricingPlan = retrievePricingPlan();
const order = retreiveOrder();
let charge;
const chargePerUnit = pricingPlan.unit;

// 移动后
const pricingPlan = retrievePricingPlan();
const chargePerUnit = pricingPlan.unit;
const order = retreiveOrder();
let charge;
```

> 关键规则：如果待移动代码引用的变量在目标位置之后被修改，不能安全移动。

---

## 8.7 拆分循环（Split Loop）

### 核心思想
一个循环做了两件事，拆分成两个循环，每个只做一件事。

### 动机
- 一个循环做一件事更容易修改
- 拆分后方便每个循环单独提炼函数
- 不用担心性能，先重构再优化不迟

### 做法
1. 复制循环代码
2. 每个循环删除不需要的计算
3. 测试，提炼每个循环到独立函数

### 示例
```javascript
// 拆分前
let averageAge = 0;
let totalSalary = 0;
for (const p of people) {
  averageAge += p.age;
  totalSalary += p.salary;
}

// 拆分后
let totalSalary = 0;
for (const p of people) {
  totalSalary += p.salary;
}

let averageAge = 0;
for (const p of people) {
  averageAge += p.age;
}
```

---

## 8.8 以管道取代循环（Replace Loop with Pipeline）

### 核心思想
使用集合管道（filter/map/reduce）取代手写循环。

### 动机
- 管道操作更清晰，从头到尾读一遍就知道计算过程
- 减少循环样板代码，突出计算逻辑
- 每个操作都是纯函数，更容易理解

### 做法
逐步把循环内的操作替换为管道运算，每次一步测试。

### 示例
```javascript
// 替换前
const names = [];
for (const i of input) {
  if (i.job === "programmer")
    names.push(i.name);
}

// 替换后
const names = input
  .filter(i => i.job === "programmer")
  .map(i => i.name)
;
```

---

## 8.9 移除死代码（Remove Dead Code）

### 核心思想
不再使用的代码，直接删掉。

### 动机
- 死代码增加阅读负担，没人看得懂它还要不要
- 版本控制系统已经保存了历史，真需要再找回来就行
- 现在不必注释掉，直接删除

---

## 重新组织数据

## 9.1 拆分变量（Split Variable）

**曾用名**：移除对参数的赋值、分解临时变量

### 核心思想
一个变量承担多个责任，把它拆分成多个变量，一个变量只负责一件事。

### 动机
- 多个用途让代码阅读者困惑
- 每个变量只做一件事，清晰明了

### 做法
1. 在第一次赋值处修改变量名，声明为不可修改
2. 修改第一次赋值前的所有引用
3. 重复直到所有赋值都拆分完成

### 示例
```javascript
// 拆分前
let temp = 2 * (height + width);
console.log(temp);
temp = height * width;
console.log(temp);

// 拆分后
const perimeter = 2 * (height + width);
console.log(perimeter);
const area = height * width;
console.log(area);
```

---

## 9.2 字段改名（Rename Field）

### 核心思想
字段名字不能清晰表达含义，就改一个更好的。

### 动机
- 数据结构的命名特别重要，好名字帮助理解程序
- 随着理解加深，不断改进命名

### 做法
1. 如果数据未封装，先封装
2. 逐步修改所有访问点，每次修改后测试
3. 最后修改内部字段名和访问函数名

### 示例
```javascript
// 改名前
class Organization {
  get name() {return this._name;}
}

// 改名后
class Organization {
  get title() {return this._title;}
}
```

---

## 9.3 以查询取代派生变量（Replace Derived Variable with Query）

### 核心思想
变量值可以从其他数据计算出来，把变量替换成计算查询。

### 动机
- 减少可变数据，可变数据是很多bug的来源
- 避免"源数据改了派生变量忘了更"的错误
- 计算本身就能表达含义，不需要额外维护变量

### 做法
1. 提炼出计算变量的查询函数
2. 添加断言验证结果一致
3. 修改所有读取点，改用查询
4. 移除变量声明

### 示例
```javascript
// 替换前
get discountedTotal() {return this._discountedTotal;}
set discount(aNumber) {
 const old = this._discount;
 this._discount = aNumber;
 this._discountedTotal += old - aNumber;
}

// 替换后
get discountedTotal() {return this.baseTotal - this.discount;}
set discount(aNumber) {this._discount = aNumber;}
```

---

## 9.4 将引用对象改为值对象（Change Reference to Value）

**反向重构**：将值对象改为引用对象（256）

### 核心思想
如果小对象不可变，把它改成值对象更简单。

### 动机
- 值对象是不可变的，使用更安全
- 不需要共享引用，每个值都是独立的，不用担心偷偷被改
- 在并发和分布式场景更友好

### 做法
1. 将对象改成不可变，移除所有设值函数
2. 提供基于值的相等性判断方法

### 示例
```javascript
// 修改前
class TelephoneNumber {
  get areaCode() {return this._areaCode;}
  set areaCode(arg) {this._areaCode = arg;}
}

// 修改后
class TelephoneNumber {
  constructor(areaCode, number) {
    this._areaCode = areaCode;
    this._number = number;
  }
  get areaCode() {return this._areaCode;}
  get number() {return this._number;}
  equals(other) {
    return this.areaCode === other.areaCode &&
           this.number === other.number;
  }
}
```

---

## 9.5 将值对象改为引用对象（Change Value to Reference）

**反向重构**：将引用对象改为值对象（252）

### 核心思想
当多个对象共享同一个实体，把它从多个值副本改成一个引用对象。

### 动机
- 值对象每个副本独立，修改一个其他不变，会造成数据不一致
- 共享实体需要用引用，确保修改一处所有地方都看到更新

### 做法
1. 创建仓库保存共享对象
2. 修改构造函数，从仓库获取对象而不是新建

### 示例
```javascript
// 修改前
class Order {
  constructor(data) {
    this._customer = new Customer(data.customer);
  }
}

// 修改后
let customerRepository = new Map();
function registerCustomer(id) {
  if (!customerRepository.has(id))
    customerRepository.set(id, new Customer(id));
  return customerRepository.get(id);
}

class Order {
  constructor(data) {
    this._customer = registerCustomer(data.customer);
  }
}
```

---

## 本章总结 - 高级重构要点

| 重构手法 | 适用场景 | 好处 |
|---------|---------|------|
| **搬移函数** | 函数频繁引用另一个上下文的数据 | 让相关代码聚集，减少依赖 |
| **搬移字段** | 字段放错了位置 | 良好数据结构让代码更简单 |
| **搬移语句到函数** | 调用前总有重复代码 | 消除重复，逻辑集中 |
| **搬移语句到调用者** | 不同调用点需要不同行为 | 调整抽象边界适应变化 |
| **以函数调用取代内联代码** | 已有函数做了相同事情 | 消除重复，利用现有实现 |
| **移动语句** | 相关代码不在一起 | 让相关代码聚集，方便后续提炼 |
| **拆分循环** | 一个循环做多个事情 | 每个循环只做一件事，更容易修改 |
| **以管道取代循环** | 可以使用集合管道操作 | 更清晰表达迭代计算逻辑 |
| **移除死代码** | 代码不再使用 | 消除负担，减少阅读干扰 |
| **拆分变量** | 一个变量多个用途 | 每个变量只做一件事，更清晰 |
| **字段改名** | 字段命名不清晰 | 数据结构命名特别重要 |
| **以查询取代派生变量** | 变量可以从其他数据计算 | 减少可变数据，避免同步错误 |
| **将引用对象改为值对象** | 小对象不可变，不需要共享 | 使用简单安全，不可变更容易处理 |
| **将值对象改为引用对象** | 多个副本需要共享同一个实体 | 保证数据一致性，修改一处所有地方可见 |

### 核心思想
- **持续调整**：随着对问题理解加深，不断调整代码元素的位置和数据结构
- **小步前进**：每次小修改后测试，比一次改很多更安全
- **消除可变**：尽可能减少可变数据，这是减少bug的有效手段
- **合适的抽象**：根据实际情况选择值对象还是引用对象，没有绝对对错

> 这些重构手法帮助你在设计演进过程中，不断调整代码结构跟上你的理解，让设计始终保持健康。