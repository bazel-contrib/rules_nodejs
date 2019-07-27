# Developing on the docsite

Running locally can be done with Jekyll.
Follow setup instructions at https://help.github.com/en/articles/setting-up-your-github-pages-site-locally-with-jekyll

Run

```sh
docs$ bundle exec jekyll serve
```

Another way to do local development without doing the Ruby setup steps is to use a docker container:

```sh
$ docker run -it --rm -v "$PWD":/usr/src/app -p "4000:4000" starefossen/github-pages
```