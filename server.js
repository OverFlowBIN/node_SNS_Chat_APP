const express = require("express");
const app = express();

// body-parser는 input안에 적힌 내용을 해석하는 기능을 한다.
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// EJS: HTML template engine
// .html => .ejs : html 파일에 서버 데이터를 넣을 수 있다.
app.set("view engine", "ejs");

// middle ware CSS 파일 걸어두기(Middle Ware: 응답 요청 사이에 동작하는 JS 코드)
// static 파일을 보관하기 위해 public폴더를 사용할 것이다라는 정의
app.use("/public", express.static("public"));

// method-override: html form tag에서 GET, POST 이외의 method를 사용하고싶을때 쓰는 Library
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

const PORT = 8080;

// $ npm install mongodb@3.6.4
const MongoClient = require("mongodb").MongoClient;

// Connect MongoDB
let db;
MongoClient.connect(
  "mongodb+srv://admin:admin1234@nodeapp.pdaand0.mongodb.net/?retryWrites=true&w=majority",
  (err, client) => {
    if (err) return console.log(err);

    db = client.db("nodeapp"); // nodeapp이라는 database에 연결하기

    // MongoDB callback에 server.listen을 넣어 동기적 실행 유도
    app.listen(PORT, () => {
      console.log(`This server listening at port : ${PORT}`);
    });
  }
);

// Home "GET"
app.get("/", (req, res) => {
  // html을 렌더리 할때는 res.sendFile('경로')
  // ejs을 렌더리 할때는 res.sendFile('파일이름'), views 폴더에 ejs 파일을 넣어야 한다.
  res.render("index.ejs");
});

// Write "GET"
app.get("/write", (req, res) => {
  res.render("write.ejs");
});

// Add(Write) "POST"
app.post("/add", (req, res) => {
  const { title, date } = req.body;

  // counter 라는 collection을 새로 post가 post 될 때 마다 count up 시켜준다.
  // 이전 번호의 _id를 갖고 있는 post가 삭제되어도 최신 count 번호를 유지 시켜주기 떄문에 유지관리에 효과적이다.
  // 가장 최근 자료를 가져오는 query가 있긴 하지만 여기선 counter로 최신자료 번호를 관리해보기로 한다.
  db.collection("counter").findOne({ name: "numsOfPost" }, (err, data) => {
    let recentNum = data.totalPost;

    // data를 저장하면 _id를 꼭 적어야 한다. 적지 않으면 강제로 _id가 부여된다.
    // 동일한 _id를 저장하면 저장되지 않는다.
    db.collection("post").insertOne({ _id: recentNum + 1, title, date }, () => {
      // updateOne, updateMany
      // arguments : 수정할 데이터, 수정값, [callback]
      // 수정값 : 보통 Operator($)를 사용한다. (set, inc(dec는 음수를 사용), min rename 등등 있음)
      db.collection("counter").updateOne(
        { name: "numsOfPost" },
        { $inc: { totalPost: 1 } },
        (err, data) => {
          if (err) console.log(err);
        }
      );
      res.send("complete data upload");
    });
  });
});

// List "GET"
app.get("/list", (req, res) => {
  // .find() : 모든 데이터 찾기이다.
  // 기본적으로 .toArray(() => {}) 와 같이 사용해서 정보를 제외한 data만 꺼내 쓴다
  db.collection("post")
    .find()
    .toArray((err, data) => {
      res.render("list.ejs", { posts: data });
    });

  // ejs 파일은 언제나 views 폴더를 만들어 그 안에 넣어줘야한다. 경로는 파일명만 작성하면 된다.
});

// Delete "DELETE"
app.delete("/delete", (req, res) => {
  req.body._id = parseInt(req.body._id);
  db.collection("post").deleteOne(req.body, (err, data) => {
    console.log("삭제완료");
    res.status(200).send({ message: "삭제되었습니다." }); // 200, 400에 따라 와 상관없이 Ajax .done 또는 .fail이 실행됨
  });
});

// Detail "GET"
app.get("/detail/:id", (req, res) => {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    (err, data) => {
      console.log("data", data);
      res.render("detail.ejs", { post: data });
    }
  );
});

// Edit "GET"
app.get("/edit/:id", (req, res) => {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    (err, data) => {
      console.log("data", data);
      if (!data) console.log("Not found");
      else res.render("edit.ejs", { post: data });
    }
  );
});

// Edit "PUT"
app.put("/edit", (req, res) => {
  const { id, title, date } = req.body;
  console.log(req.body);

  db.collection("post").updateOne(
    { _id: parseInt(id) },
    { $set: { title, date } },
    (err, data) => {
      console.log("Complete update");
    }
  );
});
