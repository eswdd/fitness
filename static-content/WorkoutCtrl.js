/*
 * Responsible for the main app, providing config and model<-> hash
 * functionality for the other controllers
 */
fitness
    .controller('WorkoutCtrl', [ '$rootScope', '$scope', '$http', '$routeParams', function WorkoutCtrl($rootScope, $scope, $http, $routeParams) {
        $scope.name = "";
        $scope.date = "";
        $scope.id = "";
        $scope.status = "";
        
        $scope.activities = [];
        
        $scope.exercises = [];

        $scope.createWorkout = function() {
            $scope.status = "";
            var data = {
                name: $scope.name,
                date: $scope.date,
                activities: $scope.activities
            }
            $http.put('/api/workout', data).success(function(json) {
                $scope.id = json.id;
                $scope.status = "Created successfully";
                $rootScope.showPage("workout/"+json.id);
            }).error(function(json,responseCode,headers,config) {
                    $scope.status = "Error creating workout: "+JSON.stringify(json);
                });
        };
        
        $scope.unpackWorkoutServerResponse = function(data) {
            $scope.id = data.id;
            $scope.name = data.name;
            $scope.date = data.date;
            $scope.activities = data.activities != null ? data.activities : [];
            
        }
        
        $scope.addActivity = function() {
            $scope.activities.push({});
        }
        
        $scope.deleteActivity = function(index) {
            $scope.activities.splice(index, 1);
        }

        $scope.saveWorkout = function() {
            $scope.status = "";
            var data = {
                name: $scope.name,
                date: $scope.date,
                activities: $scope.activities
            }
            $http.post('/api/workout/'+$scope.id, data).success(function(json) {
                $scope.unpackWorkoutServerResponse(json);
                $scope.status = "Saved successfully";
            }).error(function(json,responseCode,headers,config) {
                    $scope.status = "Error saving workout: "+JSON.stringify(json);
                });
        };
        
        $scope.closeWorkout = function() {
            $rootScope.showPage("index");
        }
        
        $scope.loadWorkout = function(id) {
            $http.get('/api/workout/'+id).success(function(json,responseCode,headers,config) {
                $scope.unpackWorkoutServerResponse(json);
                $scope.status = "Loaded successfully";
            }).error(function(json,responseCode,headers,config) {
                $scope.status = "Error loading workout: "+JSON.stringify(json);
            });
        }
        
        $scope.loadExercises = function() {$http.get('/api/exercise/all').success(function(json,responseCode,headers,config) {
            
            $scope.status = "Loaded successfully";
        }).error(function(json,responseCode,headers,config) {
                $scope.status = "Error loading workout: "+JSON.stringify(json);
            });
        }
        
        $scope.onLoad = function() {
            if ($routeParams.workoutId != null) {
                $scope.loadWorkout($routeParams.workoutId);
            }
            else {
                $scope.id = "";
                $scope.name = "";
                $scope.date = moment().format("YYYY/MM/DD");
            }
        }
        
        $scope.onLoad();
        
        $scope.minimalDataCompleted = function() {
            return $scope.date != null && $scope.date != "" && $scope.name != null && $scope.name != "";
        }
        
        $scope.createWorkoutEnabled = function() {
            return $scope.minimalDataCompleted() && $scope.id == null || $scope.id == "";
        }
        
        $scope.saveWorkoutEnabled = function() {
            return $scope.minimalDataCompleted() && !$scope.createWorkoutEnabled();
        }
        
    }]);