TumblrTree
==========

A little thing for visualizing a tumblr post's reblogs

[Link to the project page](http://shelawang.github.io/TumblrTree/)


### Known issues

- Tumblr API only returns the 50 most recent notes of a post, which means some trees could be missing entire branches.
- Posts with hundreds (not to mention thousands) of reblogs take forever to graph, since so far the only way I found to get a post's parent node is to do an API call, leading to hundreds of API calls for a post with many notes.

I'm currently trying to find ways around both of these issues.

Please help me out by filing any bugs that you find [here](https://github.com/shelawang/TumblrTree/issues).
