const home = {
  get: (req, res) => {
    // html을 렌더리 할때는 res.sendFile('경로')
    // ejs을 렌더리 할때는 res.sendFile('파일이름'), views 폴더에 ejs 파일을 넣어야 한다.
    res.render("index.ejs");
  },
};

module.exports = home;
