var DEBUG = false;

var API_BASE_URL = 'http://api.tumblr.com/v2/blog/';
var API_KEY = '56XnF2ZKMHCQIwQ0fJ4l8muYwdQPVFNsjSMGoZhceMj6LDGOVC';

// var TEST_POST_URL = 'http://paul-mccartneys-eyelashes.tumblr.com/post/38971306675/';
var TEST_POST_URL = 'http://superschneewitschen.tumblr.com/post/91550482207/';

window.onload = function() {
    if (DEBUG) {
        $("#postURL").val(TEST_POST_URL);
    }

    console.log("oh hey you cute nerd");

    addListeners();
}


////////// API method calls /////////

function generateStatsAndGraph(username, postID) {
    jQuery.getJSON(
        getAPIURL(username, "posts", "id=" + postID + "&notes_info=true"),
        null,
        function(json) {
            if (json.meta.status != 200) {
                $("#stats").html("This post doesn't exist! Please try a different URL.");
                $("#postURL").focus();

            } else {
                var post = json.response.posts[0];
                var opInfo = getOPInfo(post);

                var notes = post.notes;
                var reblogs = getReblogs(notes);

                getGraphData(reblogs, opInfo, post.note_count);
            }
        }
    );
}

function getOPInfo(post) {
    var sourceURL = post.source_url;

    if (typeof sourceURL == 'undefined') {
        return {blog_name: post.blog_name, post_id: post.id};
    } else {
        return {
            blog_name: getUsernameFromURL(sourceURL),
            post_id: getPostIDFromURL(sourceURL)
        };
    }
}

function addPostStats(noteCount, numGraphedReblogs) {
    var postURL = $("#postURL").val();

    var stats = "<a href='" + postURL + "'>This post</a> has <b>"
        + noteCount + "</b> notes. <b>"
        + numGraphedReblogs + "</b> of its reblogs are shown here."

    $("#stats").html(stats);
}

function getReblogs(notes) {
    var reblogs = jQuery.grep(notes, function(note) {
        return note.type == "reblog";
    });

    return reblogs;
}

function getAPIURL(username, endpoint, params) {
    return API_BASE_URL
        + username + '.tumblr.com/'
        + endpoint
        + '?callback=?&api_key=' + API_KEY
        + '&' + params;
}


////////// Parsing URL //////////

function getUsernameFromURL(url) {
    var splitURL = spliceURL(url)
    var blogURL = splitUrl[0];

    var split = blogURL.split(".");

    return split[0];
}

function getPostIDFromURL(url) {
    var splitURL = spliceURL(url)
    var postID = splitUrl[2];

    return postID;
}

function spliceURL(url) {
    splitUrl = url.split("/");

    // Get rid of "http" if the given URL starts with it
    if (/http/.test(splitUrl[0])) {
        splitUrl.splice(0, 2);
    }
}


////////// Listeners //////////

function addListeners() {
    addSubmitListener();
}

function addSubmitListener() {
    $("#urlForm").submit(function() {
        var postURL = $("#postURL").val();
        var username = getUsernameFromURL(postURL);
        var postID = getPostIDFromURL(postURL);

        // Show loading message
        var random = randomInt(1, 3);
        $("#stats").html("One moment please... &nbsp; <img src='icons/loader"
            + random + ".gif' height='14px'/>");
        $("#submit").attr("disabled", 1);

        clearGraph();
        generateStatsAndGraph(username, postID);

        showHiddenElements();

        return false;
    });
}

function showHiddenElements() {
    $(":hidden").each(function() {
        $(this).removeAttr("hidden");
    });
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max+1 - min)) + min;
}


////////// Graph //////////

function getGraphData(reblogs, opInfo, noteCount) {
    var data = {
        nodes: [],
        edges: [],
    };
    var node = {};
    var reblog;
    var nodeIDs = [];

    if (reblogs.length == 0) {
        $("#stats").html("This post has no reblogs!");
        $("#postURL").focus();
        return;
    }

    for (var i = 0; i < reblogs.length; i++) {
        reblog = reblogs[i];

        node = {};
        node.id = reblog.blog_name + reblog.post_id;
        node.label = reblog.blog_name;

        data.nodes.push(node);
        nodeIDs.push(node.id);
    }

    // Add node for OP
    node = {};
    node.id = opInfo.blog_name + opInfo.post_id;
    node.label = opInfo.blog_name;
    node.center = true;

    data.nodes.push(node);
    nodeIDs.push(node.id);

    // Get ready for memo-ish recursive call
    var first = reblogs.shift();
    var username = first.blog_name;
    var postID = first.post_id;

    recursiveEdges(reblogs, data, username, postID, nodeIDs, noteCount);
}

function recursiveEdges(reblogs, data, username, postID, nodeIDs, noteCount) {
    // Get the post
    $.ajax({
        dataType: "json",
        url: getAPIURL(username, "posts", "id=" + postID + "&reblog_info=true"),
        success: function(result) {

            if (result.meta.status != 200) {
                return;
            }

            var post = result.response.posts[0];
            var parentUsername = post.reblogged_from_name;
            var parentPostID = post.reblogged_from_id;

            if (typeof parentUsername != 'undefined') {
                // Create an edge if post has a parent
                var edge = {};
                edge.source = parentUsername + parentPostID;
                edge.target = post.blog_name + post.id;
                edge.id = edge.source + edge.target;
                edge.type = "arrow";

                if (nodeIDs.indexOf(edge.source) < 0) {
                    // Make a new node if parent node doesn't exist
                    var node = {};
                    node.id = edge.source;
                    node.label = parentUsername;

                    data.nodes.push(node);
                    nodeIDs.push(node.id);
                    reblogs.push({
                        blog_name: parentUsername,
                        post_id: parentPostID
                    });
                }

                data.edges.push(edge);
            }

            // Recursive base case
            if (reblogs.length == 0) {
                log(data);
                addPostStats(noteCount, data.nodes.length);
                displayGraph(data); // Finally!

                $("#submit").removeAttr("disabled");
                return;
            }

            // Pop off next reblog and continue
            var first = reblogs.shift();
            var firstUsername = first.blog_name;
            var firstPostID = first.post_id;

            recursiveEdges(reblogs, data, firstUsername, firstPostID, nodeIDs, noteCount);
        }
    });
}

function clearGraph() {
    $("#sigmaContainer").html("");
}

function displayGraph(data) {
    // Create new sigma instance
    var s = new sigma({
        graph: data,
        container: 'sigmaContainer',
        renderer: {
            container: document.getElementById('sigmaContainer'),
            type: 'canvas'
        },
        settings: {
            minNodeSize: 2,
            maxNodeSize: 8,
            defaultNodeColor: '#32506d' //tumblr blue
        }
    });

    // Add attributes not specified in the JSON
    var nodes = s.graph.nodes();
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].x = Math.random();
        nodes[i].y = Math.random();
        nodes[i].size = nodes[i].center ? 6 : 2;
    }

    s.refresh();
    s.startForceAtlas2({strongGravityMode:true});
    setTimeout(function(s) {
        s.stopForceAtlas2()
    }, 10000, s);
}

function log(str) {
    if (DEBUG) {
        console.log(str);
    }
}


// idea: graph a blog's followers to a number of degrees
// use plugins relativeSize and neighborhoods
