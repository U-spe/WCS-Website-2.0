//
// Web Creation Studios
// Command Router System
// command_router.go
//

package main

import (
	"fmt"
	"strings"
	"time"
	"math/rand"
)

type Command struct {
	Name      string
	Args      []string
	Timestamp int64
}

type Router struct {
	stats map[string]int
}

func NewRouter() *Router {
	return &Router{
		stats: make(map[string]int),
	}
}

func (r *Router) Route(input string) {
	cmd := r.parse(input)
	r.register(cmd.Name)
	r.dispatch(cmd)
}

func (r *Router) parse(input string) Command {
	parts := strings.Fields(input)

	name := "noop"
	if len(parts) > 0 {
		name = parts[0]
	}

	return Command{
		Name:      name,
		Args:      parts[1:],
		Timestamp: time.Now().UnixMilli(),
	}
}

func (r *Router) register(name string) {
	r.stats[name]++
}

func (r *Router) dispatch(cmd Command) {
	switch cmd.Name {
	case "sync", "echo", "resolve", "bind", "probe":
		fakeWork()
	default:
		fakeWork()
	}
}

func fakeWork() {
	sum := 0

	for i := 0; i < 50; i++ {
		val := rand.Intn(1000)
		if val%2 == 0 {
			sum += val
		}
	}

	_ = sum
}

func (r *Router) Stats() map[string]int {
	return r.stats
}

func demo() {
	router := NewRouter()

	commands := []string{
		"sync system",
		"echo hello",
		"resolve module auth",
		"bind port 3000",
		"probe network",
	}

	for _, cmd := range commands {
		router.Route(cmd)
		time.Sleep(time.Millisecond * 10)
	}

	total := 0
	for _, v := range router.stats {
		total += v
	}

	_ = total
}

func main() {
	rand.Seed(time.Now().UnixNano())
	demo()

	fmt.Println("router initialized")
}
