var AWS = require("aws-sdk");

var credentials = new AWS.SharedIniFileCredentials({profile: 'fitness'});
AWS.config.credentials = credentials;

AWS.config.update({
    region: "eu-west-1",
    endpoint: "http://localhost:8111"
});

var dynamodb = new AWS.DynamoDB();

var idTableDef = {
    TableName: "Ids",
    KeySchema: [
        { AttributeName: "user", KeyType: "HASH"},  //Partition key
        { AttributeName: "table", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "user", AttributeType: "S" },
        { AttributeName: "table", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
}

var workoutTableDef = {
    TableName : "Workouts",
    KeySchema: [
        { AttributeName: "user", KeyType: "HASH"},  //Partition key
        { AttributeName: "id", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "user", AttributeType: "S" },
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
};

var workoutItemMapper = {
    toDb: function(data) {
        var item = workoutItemMapper.getKey(data);
        item.name = { S: data.name };
        item.date = { S: data.date };
        return item;
    },
    getKey: function(data) {
        var key = {};
        key.user = { S: data.user };
        key.id = { S: data.id };
        return key;
    },
    fromDb: function(item) {
        if (item.user == null || item.id == null) {
            return null;
        }
        var data = {};
        data.user = item.user.S;
        data.id = item.id.S;
        data.name = item.name != null ? item.name.S : null;
        data.date = item.date != null ? item.date.S : null;
        return data;
    }
}

var exerciseTableDef = {
    TableName : "Exercises",
    KeySchema: [
        { AttributeName: "user", KeyType: "HASH"},  //Partition key
        { AttributeName: "id", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "user", AttributeType: "S" },
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
}

var exerciseItemMapper = {
    toDb: function(data) {
        var item = exerciseItemMapper.getKey(data);
        item.typeId = { S: data.typeId };
        if (data.weight != null) {
            item.reps = { N: data.reps };
            item.weight = { N: data.weight };
            item.units = { S: data.units };
        }
        if (data.time != null) {
            item.time = { S: data.time };
        }
        return item;
    },
    getKey: function(data) {
        var item = {};
        item.user = { S: data.user };
        item.id = { S: data.id };
        return item;
    },
    fromDb: function(item) {
        var data = {};
        data.user = item.user.S;
        data.id = item.id.S;
        data.typeId = item.typeId.S;
        if (item.weight != null) {
            data.reps = item.reps.N;
            data.weight = item.weight.N;
            data.units = item.units.S;
        }
        if (item.time != null) {
            data.time = item.reps.S;
        }
        return data;
    }
}

var exerciseTypeTableDef = {
    TableName : "ExerciseTypes",
    KeySchema: [
        { AttributeName: "user", KeyType: "HASH"},  //Partition key
        { AttributeName: "id", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "user", AttributeType: "S" },
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
}

var exerciseTypeItemMapper = {
    toDb: function(data) {
        var item = exerciseTypeItemMapper.getKey(data);
        item.label = { S: data.label };
        item.const = { S: data.const };
        return item;
    },
    getKey: function(data) {
        var item = {};
        item.user = { S: data.user };
        item.id = { S: data.id };
        return item;
    },
    fromDb: function(item) {
        var data = {};
        data.user = item.user.S;
        data.id = item.id.S;
        data.label = item.label.S;
        data.const = item.const.S;
        return data;
    }
}

var createTable = function(tableDef, successFn) {
    dynamodb.createTable(tableDef, function(err, data) {
        if (err) {
            console.error("Unable to create table '"+tableDef.TableName+"'. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Created table '"+tableDef.TableName+"'.");
            successFn();
        }
    });
}

var ensureTable = function(tableDef, completeFn) {
    dynamodb.describeTable({TableName: tableDef.TableName}, function(err, data) {
        if (err) {
            if (err.code == "ResourceNotFoundException") {
                // todo: ensure it's available
                createTable(tableDef, completeFn);
            }
        }
        else {
            console.log("Table found '"+tableDef.TableName+"'");
            completeFn();
        }
    });
}


var dynamoDbWrapper = {
    getAllItems: function(tableName, user, itemMapper, callback) {
        console.log("getAllItems("+tableName+","+user+")")
        var params = {
            TableName: tableName,
            Select: "ALL_ATTRIBUTES",
            ReturnConsumedCapacity: "NONE"
        }
        
        var ret = [];
        var apiCallback = function(err, data) {
            if (err) {
                callback(err, toReturn);
                return;
            }
            for (var i = 0; i<data.Items.length; i++) {
                ret.push(itemMapper.fromDb(data.Items[i]));
            }
            var lastKey = data.LastEvaluatedKey;
            var wasLast = lastKey == null;
            if (!wasLast) {
                for (var k in lastKey) {
                    if (lastKey.hasOwnProperty(k)) {
                        wasLast = true;
                        break;
                    }
                }
            }
//            console.log("ret = "+JSON.stringify(ret))
//            console.log("lastkey = "+JSON.stringify(lastKey));
            if (!wasLast) {
                params.ExclusiveStartKey = lastKey;
                dynamodb.scan(params, apiCallback);
            }
            else {
                callback(null, ret);
            }
        }
        dynamodb.scan(params, apiCallback);
    },
    getItem: function(tableName, user, id, itemMapper, callback) {
        console.log("getItem("+tableName+","+user+","+id+")")
        var params = {
            TableName: tableName,
            Key: { user: { S: user }, id: { S: id.toString() }}
        }
        dynamodb.getItem(params, function(err,data) {
            if (err) {
//                console.log("getItem: err: "+JSON.stringify(err));
                callback(err, null);
            }
            else {
//                console.log("getItem: data: "+JSON.stringify(data));
                callback(null, itemMapper.fromDb(data.Item));
            }
        });
    },
    insertItem: function(tableName, user, data, itemMapper, callback) {
        console.log("insertItem("+tableName+","+user+","+JSON.stringify(data)+")")
        dynamoDbWrapper.getNextId(tableName, user, function(err,id) {
            if (err) {
                callback(err, null);
                return;
            }
//            console.log("nextid = "+id);
            data.id = id.toString();
            data.user = user;
            var params = {
                TableName: tableName,
                Item: itemMapper.toDb(data),
                ConditionExpression: 'attribute_not_exists(id)'
            }
            var apiCallback = function(err, callData) {
                if (err) {
                    callback(err, null);
                }
                else {
                    callback(null, data);
                }
            }
            dynamodb.putItem(params, apiCallback);
        })
    },
    updateItem: function(tableName, user, id, origData, itemMapper, callback) {
        console.log("updateItem("+tableName+","+user+","+id+","+JSON.stringify(origData)+")")
        origData.user = user;
        origData.id = id;
        var params = {
            TableName: tableName,
            Item: itemMapper.toDb(origData),
            ConditionExpression: 'attribute_exists(id)'
        }
        var apiCallback = function(err, data) {
            callback(err,origData);
        }
        dynamodb.putItem(params, apiCallback);
    },
    getNextId: function(tableName, user, origCallback) {
        console.log("getNextId("+tableName+","+user+")")
        var params = {
            TableName: "Ids",
            Key: {
                user: { S: user },
                table: { S: tableName}
            }
        }
        var incrementId = function(params) {
//            console.log("get current id: "+JSON.stringify(params))
            dynamodb.getItem(params, function(err, data) {
                var nextId;
                var conditionExpression;
                var expressionAttributeValues = {};
                if (err || data == null) {
                    nextId = 0;
                    console.log("Error getting previous id, intialising next to 0")
                    console.log(JSON.stringify(err));
                }
                else {
                    console.log("Got response, data = "+JSON.stringify(data));
                    if (data.Item != null && data.Item.id != null) {
                        conditionExpression = 'attribute_exists(id) AND id = :id';
                        expressionAttributeValues = { ":id": data.Item.id };
                        nextId = parseInt(data.Item.id.S) + 1;
                    }
                    else {
                        conditionExpression = 'attribute_not_exists(id)';
                        nextId = 0;
                    }
                    
                }
                var updateParams = {
                    TableName: "Ids",
                    Item: {
                        user: { S: user },
                        table: { S: tableName },
                        id: { S: nextId.toString() }
                    },
                    ConditionExpression: conditionExpression,
                    ExpressionAttributeValues: expressionAttributeValues
                }
                dynamodb.putItem(updateParams, function(err, data) {
                    if (err) {
                        console.log("error updating: "+JSON.stringify(err));
                        console.log("orig request: "+JSON.stringify(updateParams));
                        if (!err.retryable) {
                            origCallback(err, null);
                            return;
                        }
                        incrementId(params);
                    }
                    else {
                        origCallback(null, nextId);
                    }
                });
                
            })
        } 
        incrementId(params);
        
    }
}


// Server stuff ---------
var startServer = function() {

    var http = require('http'),
        fs = require('fs'),
        bodyparser = require('body-parser');
    
    
    var express = require('express');
    
    var app = express();
    app.use(bodyparser.json());
    
    app.use(express.static('.'));
    app.use(express.static('./static-content'));
    
    // fitness backend
    var fitness = express.Router();
    
    // middleware specific to this router
    fitness.use(function timeLog(req, res, next) {
        console.log(new Date(Date.now())+': '+req.originalUrl);
        next();
    })
    // restful stuff - hey why not
    
    // clone a workout to create a new one
    fitness.get('/workout/:workout_id/clone', function(req, res) {
        dynamoDbWrapper.getItem("Workouts", "eswdd", req.params.workout_id, workoutItemMapper, function(err, data) {
            data.id = null;
            dynamoDbWrapper.insertItem("Workouts", "eswdd", data, workoutItemMapper, function(err, data) {
                if (err) {
                    res.status(500).json(err);
                }
                else {
                    res.json(data);
                }
            });
        });
    });
    // get a stored workout(s)
    fitness.get('/workout/:workout_id', function(req, res) {
        if (req.params.workout_id == "all") {
            dynamoDbWrapper.getAllItems("Workouts", "eswdd", workoutItemMapper, function(err, data) {
                if (err) {
                    res.status(500).json(err);
                }
                else {
                    res.json(data);
                }
            });
        }
        else {
            dynamoDbWrapper.getItem("Workouts", "eswdd", req.params.workout_id, workoutItemMapper, function(err, data) {
                if (err) {
                    res.status(500).json(err);
                }
                else {
                    res.json(data);
                }
            });
        }
    });
    // create a new workout
    fitness.put('/workout', function(req, res) {
        dynamoDbWrapper.insertItem("Workouts", "eswdd", req.body, workoutItemMapper, function(err, data) {
            if (err) {
                res.status(500).json(err);
            }
            else {
                res.json(data);
            }
        });
    });
    // update a workout
    fitness.post('/workout/:workout_id', function(req, res) {
        dynamoDbWrapper.updateItem("Workouts", "eswdd", req.params.workout_id, req.body, workoutItemMapper, function(err, data) {
            if (err) {
                res.status(500).json(err);
            }
            else {
                res.json(data);
            }
        });
    });
    // delete a workout
    fitness.delete('/workout/:workout_id', function(req, res) {
        res.json([req.params.workout_id]);
    });
    // add an activity to a workout
    fitness.put('/workout/:workout_id/activity', function(req, res) {
        res.json([req.params.workout_id]);
    });
    // update an activity
    fitness.post('/workout/:workout_id/activity/:activity_id', function(req, res) {
        res.json([req.params.workout_id, req.params.activity_id]);
    });
    // delete an activity
    fitness.delete('/workout/:workout_id/activity/:activity_id', function(req, res) {
        res.json([req.params.workout_id, req.params.activity_id]);
    });
    // list stored exercises
    fitness.get('/exercise/:exercise_id', function(req, res) {
        if (req.params.exercise_id == "all") {
            dynamoDbWrapper.getAllItems("Exercises", "eswdd", exerciseItemMapper, function(err, data) {
                if (err) {
                    res.status(500).json(err);
                }
                else {
                    res.json(data);
                }
            });
        }
        else {
            dynamoDbWrapper.getItem("Exercises", "eswdd", req.params.exercise_id, exerciseItemMapper, function(err, data) {
                if (err) {
                    res.status(500).json(err);
                }
                else {
                    res.json(data);
                }
            });
        }
    });
    // create an exercise
    fitness.put('/exercise', function(req, res) {
        res.json({});
    });
    // update an exercise
    fitness.post('/exercise/:exercise_id', function(req, res) {
        res.json([req.params.exercise_id]);
    });
    // delete an exercise
    fitness.delete('/exercise/:exercise_id', function(req, res) {
        res.json([req.params.exercise_id]);
        res.json({});
    });
    // list stored exercise types
    fitness.get('/exerciseType', function(req, res) {
        res.json({});
    });
    
    app.use('/api',fitness);
    
    var server = app.listen(1234, function() {
        var host = server.address().address;
        var port = server.address().port;
    
        console.log('Fitness running at http://%s:%s', host, port)
    });
};

var insertManyItems = function(tableName, user, items, itemMapper, callback) {
    if (items.length == 0) {
        callback(null);
        return;
    }
    
    var item = items.splice(0,1);
    dynamoDbWrapper.insertItem(tableName, user, item, exerciseItemMapper, function(err, data) {
        if (err) {
            callback(null);
        }
        else {
            insertManyItems(tableName, user, items, itemMapper, callback);
        }
    })
}


console.log("Initialising");
ensureTable(idTableDef, function() {
    ensureTable(workoutTableDef, function() {
        ensureTable(exerciseTypeTableDef, function() {
            var exerciseTypes = [];
            insertManyItems(exerciseTypeTableDef.TableName, "eswdd", exerciseTypes, exerciseTypeItemMapper, function(err) {
                if (!err) {
                    ensureTable(exerciseTableDef, function() {
                        var exercises = [];
                        insertManyItems(exerciseTableDef.TableName, "eswdd", exercises, exerciseItemMapper, function(err) {
                            if (!err) {
                                console.log("Inserted")
                                startServer();
                            }
                            else {
                                console.log("Failed to insert exercises: "+JSON.stringify(err));
                            }
                        });
                    });
                }
                else {
                    console.log("Failed to insert exercise types: "+JSON.stringify(err));
                }
            })
        });
    });
});




