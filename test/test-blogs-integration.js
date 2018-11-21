'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];
  
  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogData());
  }
  return BlogPost.insertMany(seedData);
}

function generateComments() {
  let array = [];
  array.length = Math.floor(Math.random() * 4);
  const comment = {content: faker.fake("{{lorem.sentence}}")};

  for (let i=1; i<=array.length; i++){
    array.push(comment);
  }
  return array;
}

function generateBlogData() {
  return {
    author: {
      firstName: faker.fake("{{name.firstName}}"),
      lastName: faker.fake("{{name.lastName}}")
    },
    title: faker.fake("{{random.words}}"),
    content: faker.fake("{{lorem.sentences}}"),
    created: faker.fake("{{date.past}}"),
//    comments: generateComments(),
  };
}


function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blogs API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {

    it('should return all existing blogs', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body).to.have.lengthOf.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        });
    });


    it('should return blogs with right fields', function() {

      let resBlog;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);

          res.body.forEach(function(blog) {
            expect(blog).to.be.a('object');
            expect(blog).to.include.keys(
              'id', 'title', 'content', 'author', 'created');
          });
          resBlog = res.body[0];
          return BlogPost.findById(resBlog.id);
        })
        .then(function(blog) {

          expect(resBlog.id).to.equal(blog.id);
          expect(resBlog.title).to.equal(blog.title);
          expect(resBlog.content).to.equal(blog.content);
          expect(resBlog.author).to.equal(blog.authorName);
        //  expect(resBlog.created).to.equal(blog.created);
        //  expect(resBlog.comments).to.equal(blog.comments);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog', function() {

      const newBlog = generateBlogData();
      console.info(newBlog)

      return chai.request(app)
        .post('/posts')
        .send(newBlog)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'title', 'content', 'author', 'created');
          expect(res.body.title).to.equal(newBlog.title);
          expect(res.body.id).to.not.be.null;
          expect(res.body.content).to.equal(newBlog.content);
          expect(res.body.author).to.equal(`${newBlog.author.firstName} ${newBlog.author.lastName}`);
          console.info(res.body)
        //  expect(res.body.created).to.equal(newBlog.created);
        //  expect(res.body.comments).to.equal(newBlog.comments);
          return BlogPost.findById(res.body.id);
        })
        .then(function(blog) {
          expect(blog.title).to.equal(newBlog.title);
          expect(blog.content).to.equal(newBlog.content);
          expect(blog.authorName).to.equal(`${newBlog.author.firstName} ${newBlog.author.lastName}`);
        //  expect(blog.created).to.equal(newBlog.created);
        //  expect(blog.comments).to.equal(newBlog.comments);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields you send over', function() {
      const updateData = {
        title: 'updated blog',
        content: 'my new awsome blog content'
      };

      return BlogPost
        .findOne()
        .then(function(blog) {
          updateData.id = blog.id;

          return chai.request(app)
            .put(`/posts/${blog.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(blog) {
          expect(blog.title).to.equal(updateData.title);
          expect(blog.content).to.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('delete a blog by id', function() {

      let blog;

      return BlogPost
        .findOne()
        .then(function(_blog) {
          blog = _blog;
          return chai.request(app).delete(`/posts/${blog.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(blog.id);
        })
        .then(function(_blog) {
          expect(_blog).to.be.null;
        });
    });
  });
});
