const express = require("express");
const app = express();
require("dotenv").config();

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

// multer
// local에 저장하는 방식 : diskStorage,
// RAM에 저장: 휘방성, memoryStorage
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 저장되는 위치 설정
    cb(null, "./public/imgs");
  },
  filename: function (req, file, cb) {
    // 기존 파일 네임 그대로 이용하여 저장
    // file.originalname는 string이기 떄문에 추가적으로 날짜, 속성 들을 붙여서 저장 할 수 있다.
    // 하지만 뒤에 붙이면 확장자가 날라간다.
    cb(null, file.originalname);
  },
  // file filter를 이용한 파일 거르는 작업
  filefilter: function (req, file, callback) {
    // path : node.js 기본 라이브러리
    let ext = path.extname(file.originalname);
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      return callback(new Error("PNG, JPG만 업로드하세요"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 1024 * 1024,
  },
});
// upload를 middle ware로 사용하면 된다.
const upload = multer({ storage: storage });

// npm install passport passport-local express-session
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
// express-session : 세션데이터를 생성해주는 라이브러리
// 실제 서비스에서는 express-session보다는 MongoDB에서 저장해주는 라이브러리를 이용하면 좋다.
const session = require("express-session");
app.use(
  session({
    secret: "secretcode12983719",
    resave: true,
    saveUninitialized: false,
  })
);
app.use(passport.initialize()); // passport 초기화
app.use(passport.session()); // session 초기화
// 특정 부분에서만 middle ware를 실행하고 싶으면 prameter에 넣고 next()를 활용한다.

const PORT = process.env.PORT || 8080;

// 인증 방식 세부 코드 작성해야됨
// passport를 이용하여 아이디/비번 검증하기. => 이후 세션정보를 만들어줘야함.
passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true, // 로그인 후 세션 저장 여부
      passReqToCallback: false, // id,pw 외의 다른 정보 검증 여부
    },
    function (inputID, inputPW, done) {
      //console.log(inputID, inputPW);
      db.collection("login").findOne({ id: inputID }, function (err, data) {
        if (err) return done(err);
        // done(서버에러, 성공시 사용자 DB data, message)
        if (!data)
          return done(null, false, { message: "존재하지않는 아이디요" });
        if (inputPW == data.pw) {
          return done(null, data);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);

// 로그인을 성공한 user의 정보를 session에 저장하는 함수
passport.serializeUser((user, done) => {
  done(null, user.id); // 보통 id값만을 이용하여 session data를 만든다
});

// 페이지에 방문하는 모든 clinent에 대한 정보를 req.user라는 변수에 전달해주는 함수이다.
// 유저 정보는 id만 있는 상태이다(위에서 그렇게 만듬)
// DB에서 id(= serializeUser에서 user.id)를 이용하여 추가 정보를 갖고와야 한다.
passport.deserializeUser((id, done) => {
  db.collection("login").findOne({ id }, (err, data) => {
    done(null, data);
  });
});

// $ npm install mongodb@3.6.4
const MongoClient = require("mongodb").MongoClient;

// Connect MongoDB
let db;
MongoClient.connect(
  process.env.DB_URL +
    "@nodeapp.pdaand0.mongodb.net/?retryWrites=true&w=majority",
  { useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.log(err);

    db = client.db("nodeapp"); // nodeapp이라는 database에 연결하기

    // MongoDB callback에 server.listen을 넣어 동기적 실행 유도
    app.listen(PORT, () => {
      console.log(`This server listening at port : ${PORT}`);
    });
  }
);

const homeRoute = require("./src/routes/home");

app.use("/", homeRoute);

// Write "GET"
app.get("/write", (req, res) => {
  res.render("write.ejs");
});

// Add(Write) "POST"
app.post("/add", (req, res) => {
  const { title, date } = req.body;

  if (!req.user) res.render("fail.ejs");

  // TODO: session이 없을 떄 글쓰기를 누르면 서버가 멈춤 => 로그인했을때만 가능 하도록 만들기 or 익명 게시판?

  // counter 라는 collection을 새로 post가 post 될 때 마다 count up 시켜준다.
  // 이전 번호의 _id를 갖고 있는 post가 삭제되어도 최신 count 번호를 유지 시켜주기 떄문에 유지관리에 효과적이다.
  // 가장 최근 자료를 가져오는 query가 있긴 하지만 여기선 counter로 최신자료 번호를 관리해보기로 한다.
  db.collection("counter").findOne({ name: "numsOfPost" }, (err, data) => {
    const recentNum = data.totalPost;

    // 작성자 데이터 추가(deserializeUsere()를 통해 req.user를 사용할 수 았다.)
    const writer = req.user._id;

    const insertData = { _id: recentNum + 1, title, date, writer };

    // data를 저장하면 _id를 꼭 적어야 한다. 적지 않으면 강제로 _id가 부여된다.
    // 동일한 _id를 저장하면 저장되지 않는다.
    db.collection("post").insertOne(insertData, () => {
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
      res.redirect("/list");
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

  // 해당 글의 작성자만 삭제 가능하도록 하기 (session 이용)
  const deleteDate = { _id: req.body._id, writer: req.user._id };

  db.collection("post").deleteOne(deleteDate, (err, data) => {
    if (err) console.log(err);
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
      console.log("GET edit");
      res.render("edit.ejs", { post: data });
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
      res.redirect("/list");
    }
  );
});

// Login page "GET"
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Login "POST"
// passport.authenticate('local'[, option]) => Local 방식으로 회원인지를 인증함.
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/fail", (req, res) => {
  res.render("fail.ejs");
});

// 로그인 여부 파악 함수
function loggin(req, res, next) {
  if (req.user) next();
  else res.send("로그인이 필요합니다.");
}

// My-page "GET"
app.get("/mypage", loggin, (req, res) => {
  // console.log(req.user);
  res.render("mypage.ejs", { user: req.user });
});

// TODO: 회원 가입 추가하기(비밀번호 암호화 해서 저장) //

// Search "GET"
app.get("/search", (req, res) => {
  console.log(req.query.value);

  // string 포함된 db data 찾기
  // 1. 정규식을 이용하기 => 계시물이 많을때 오래 걸림(find는 전체를 찾음)
  // 2. indexing을 이용함 검색하기
  //  - 기본적으로 binary search로 이루어짐 => 어떠한 기준에 의한 정렬이 되어 있어야함
  //  - _id같은 경우 정렬이 되어있다.
  //  - title(string)은 정렬이 되어있지 않다 => indexing 해줘야 한다.
  //  - mongodb atlas에서 create index 기능을 활용 할 수 있다.
  //  - { "title": "text" } 를 추가해준다 => binary search
  //  - text을 기준으로 하는 방식은 최근 mongodb에서 빠른 index를 미리 만들어 제공해준다(이용하면 최적화 속도를 얻을 수 있다)
  // 만들어 둔 index를 활용한 검색 operator 구현
  // 해당 operator는 띄어쓰기 기준으로 검색을 해준다(test에서 te를 검색한다고 나오지 않는다) => "search index 기능을 사용해야 한다"
  //  해결책
  //    - 1. text index를 사용하지 않고 검색할 문서의 양에 제한을 두는 방법 : 날짜를 기준(new Date())으로 최신 게시물 몇개만 검색 가능하도록 함.
  //    - 2. text index algorithm을 변경 => mongodb atlas에는 해당 기능이 없다 => 설치해서 하는 방법이 있긴하지만 매우 어려움
  //    - 3. search indexs 기능을 활용하기(띄어쓰기 기반이 아닌 모든 글자를 찾음, 한글의 조사 등을 제외시키는 기능을 포함 lucenen.korean)
  // 구글에서 사용되는 방식으로 text 검색이 가능하다 (value1, value2) => value1 or value2가 포함된 data 검색

  // text index를 활용한 검색
  // db.collection("post")
  //   .find({ $text: { $search: req.query.value } })
  //   .toArray((err, data) => {
  //     console.log(data);
  //     res.render("search.ejs", { posts: data });
  //   });

  var searchConditon = [
    {
      $search: {
        index: "title_search",
        text: {
          query: req.query.value,
          path: "title", // title, date 둘다 찾고 싶으면 ['title', 'date']
        },
      },
    },
    // sort: _id 순서로 정렬 : -1이면 내림차순, 1이면 오름차순
    // 만약 sort가 없으면 searchScore 기능을 이용하여 검색 결과를 정렬한다 (여러 가지 검색 점수가 있음)
    { $sort: { _id: 1 } },
    // limit: 10개만 검색해서 보여주기
    { $limit: 10 },
    // project : 챶은 data 중에 일부만 가져오거나 searchScore점수를 추가해서 가져오거나 할때 사용함
    // { $project: { title: 1, _id: 0, score: { $meta: "searchScore" } } },
  ];
  console.log(req.query);

  db.collection("post")
    // 여러가지 검색조건 => aggregate paramter에 순서대로 넣으면 된다.
    // $sort를 쓰면 결과를 정렬해서 가져옵니다. _id를 오름차순으로 정렬해주세요~ 라고 썼습니다.
    // $limit을 쓰면 결과를 제한해줍니다. 맨위의 10개만 가져오라고 시켰습니다.
    // $project를 쓰면 찾아온 결과 중에 원하는 항목만 보여줍니다.
    .aggregate(searchConditon)
    .toArray((err, data) => {
      console.log(data);
      res.render("search.ejs", { posts: data });
    });
});

app.post("/register", (req, res) => {
  const { id, pw } = req.body;

  // TODO: id unique 검사, id 유효성 검사, password 암호화

  db.collection("login").insertOne({ id, pw }, (err, data) => {
    res.redirect("/");
  });
});

// Upload "GET" (파일 업로드)
// 이미지는 보통 일반하드에 저장하는게 싸고 편함(MongoDB 저장 안함)
app.get("/upload", (req, res) => {
  res.render("upload.ejs");
});

// Upload "POST" (파일 업로드)
// npm install multer 사용하기
// multipart data를 쉽게 처리하기 위한 library, 전송된 파일을 저장시켜주고, 분석해준다.
// Multer는 파일 업로드를 위해 사용되는 multipart/form-data 를 다루기 위한 node.js 의 미들웨어 입니다. 효율성을 최대화 하기 위해 busboy 를 기반으로 하고 있습니다.
// upload.single('upload.ejs form tag input의 name속성이름') 미들웨어 넣어주기(파일 하나 올리기)
// upload.array('input name', nums) : 여러개의 파일을 한번에 올릴 수 있다. 하지만 여러개 보낼 수 있게하는 form tag로 수정해야된다.
app.post("/upload", upload.single("image"), (req, res) => {
  res.send("done");
});

// 파마리머를 활용한 이미지 사진 보여주기
app.get("/image/:imageName", (req, res) => {
  // imageName의 확장자 까지 다 들어가야 파일을 보낼 수 있다.
  let imageName = req.params.imageName;
  res.sendFile(__dirname + "/public/imgs/" + imageName);
});

// MongoDB에 데이터를 넣고 뺄때 사용하는 라이브러리 2가지
// 1. MongoDB Native Driver(예전에 필수였지만 지금은 쉬워짐)
// 2. Mongoose => query, validation 등이 쉬워짐

// 채팅/댓글 기능
app.get("/chat", (req, res) => {
  res.render("chat.ejs");
});
